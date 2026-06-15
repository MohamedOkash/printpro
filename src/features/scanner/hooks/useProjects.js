import { useState, useRef, useEffect, useCallback } from 'react'
import { getStorage, generateId } from '../../../services/projectService'

async function pageToBase64(page) {
  try {
    const resp = await fetch(page.src)
    const blob = await resp.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ name: page.name, data: reader.result })
      reader.readAsDataURL(blob)
    })
  } catch {
    return { name: page.name, data: null }
  }
}

async function serializePages(pages) {
  const results = []
  for (const p of pages) {
    const converted = await pageToBase64(p)
    results.push(converted)
  }
  return results
}

function deserializePages(pageData) {
  return (pageData || []).map((p) => ({
    id: Date.now() + Math.random(),
    src: p.data ? URL.createObjectURL(dataURLtoBlob(p.data)) : null,
    name: p.name || 'Untitled',
  }))
}

function dataURLtoBlob(dataurl) {
  if (!dataurl) return new Blob()
  const parts = dataurl.split(',')
  const meta = parts[0]
  const isBase64 = meta && meta.indexOf('base64') !== -1
  const raw = parts[1]
  if (isBase64 && raw) {
    const binary = atob(raw)
    const buffer = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i)
    const type = (meta.split(':')[1] || '').split(';')[0]
    return new Blob([buffer], { type })
  }
  return new Blob()
}

const SAVE_INTERVAL = 5000

export function useProjects({ user, showToast }) {
  const [currentProjectId, setCurrentProjectId] = useState(null)
  const [currentProjectTitle, setCurrentProjectTitle] = useState('')
  const [projects, setProjects] = useState([])
  const [isSaving, setIsSaving] = useState(false)

  const stateRef = useRef(null)
  const isDirtyRef = useRef(false)
  const storageRef = useRef(getStorage(user))
  const projectIdRef = useRef(null)
  const mountedRef = useRef(true)
  const intervalRef = useRef(null)

  // Keep projectId in sync
  useEffect(() => {
    projectIdRef.current = currentProjectId
  }, [currentProjectId])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Update storage when auth changes
  useEffect(() => {
    storageRef.current = getStorage(user)
    if (!user) {
      setCurrentProjectId(null)
      setCurrentProjectTitle('')
    }
    loadProjects()
  }, [user])

  const loadProjects = useCallback(async () => {
    try {
      const list = await storageRef.current.list()
      if (mountedRef.current) setProjects(list)
    } catch (e) {
      console.error('Failed to load projects:', e)
    }
  }, [])

  const doSave = useCallback(async (id, data) => {
    try {
      await storageRef.current.update(id, data)
    } catch (e) {
      console.error('Project save failed:', e)
    }
  }, [])

  const saveCurrentProject = useCallback(async () => {
    const state = stateRef.current
    const id = projectIdRef.current
    if (!state || !id) return

    setIsSaving(true)
    try {
      const pagesData = state.pages ? await serializePages(state.pages) : []
      const snapshot = {
        title: state.title || 'Untitled',
        createdAt: state.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activePage: state.activePage ?? 0,
        pages: pagesData,
        crop: state.crop || {},
        filters: state.filters || {},
        watermark: state.watermark || {},
        ocr: state.ocr || {},
        scanner: state.scanner || {},
      }
      await doSave(id, snapshot)
      if (mountedRef.current) {
        setCurrentProjectTitle(snapshot.title)
      }
    } catch (e) {
      console.error('Save failed:', e)
    } finally {
      if (mountedRef.current) setIsSaving(false)
    }
  }, [doSave, loadProjects])

  const finalSave = useCallback(async () => {
    const state = stateRef.current
    const id = projectIdRef.current
    if (!state || !id) return
    try {
      const pagesData = state.pages ? await serializePages(state.pages) : []
      const snapshot = {
        title: state.title || 'Untitled',
        createdAt: state.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activePage: state.activePage ?? 0,
        pages: pagesData,
        crop: state.crop || {},
        filters: state.filters || {},
        watermark: state.watermark || {},
        ocr: state.ocr || {},
        scanner: state.scanner || {},
      }
      await doSave(id, snapshot)
    } catch (e) {
      console.error('Final save failed:', e)
    }
  }, [doSave])

  // Periodic save loop
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = setInterval(() => {
      if (isDirtyRef.current && projectIdRef.current) {
        isDirtyRef.current = false
        saveCurrentProject()
      }
    }, SAVE_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [saveCurrentProject])

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (isDirtyRef.current && projectIdRef.current) {
        finalSave()
      }
    }
  }, [finalSave])

  // Store latest state and mark dirty
  const updateState = useCallback((stateSnapshot) => {
    stateRef.current = stateSnapshot
    isDirtyRef.current = true
  }, [])

  const createProject = useCallback(
    async (title, initialState) => {
      const id = generateId()
      const now = new Date().toISOString()
      const data = {
        title: title || 'Untitled',
        createdAt: now,
        updatedAt: now,
        activePage: 0,
        pages: [],
        crop: {},
        filters: {},
        watermark: {},
        ocr: {},
        scanner: {},
        ...initialState,
      }
      try {
        await storageRef.current.create(id, data)
        stateRef.current = data
        isDirtyRef.current = false
        if (mountedRef.current) {
          setCurrentProjectId(id)
          setCurrentProjectTitle(data.title)
        }
        await loadProjects()
        return id
      } catch (e) {
        console.error('Create project failed:', e)
        return null
      }
    },
    [loadProjects]
  )

  const openProject = useCallback(async (id) => {
    try {
      const data = await storageRef.current.read(id)
      if (!data) return null

      const restoredPages = deserializePages(data.pages || [])

      const restored = {
        title: data.title || 'Untitled',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        activePage: data.activePage ?? 0,
        pages: restoredPages,
        crop: data.crop || {},
        filters: data.filters || {},
        watermark: data.watermark || {},
        ocr: data.ocr || {},
        scanner: data.scanner || {},
      }

      stateRef.current = restored
      isDirtyRef.current = false
      if (mountedRef.current) {
        setCurrentProjectId(id)
        setCurrentProjectTitle(restored.title)
      }
      return { id, ...restored }
    } catch (e) {
      console.error('Open project failed:', e)
      return null
    }
  }, [])

  const renameProject = useCallback(
    async (id, title) => {
      try {
        await storageRef.current.update(id, {
          title,
          updatedAt: new Date().toISOString(),
        })
        if (id === currentProjectId && mountedRef.current) {
          setCurrentProjectTitle(title)
        }
        await loadProjects()
      } catch (e) {
        console.error('Rename project failed:', e)
      }
    },
    [currentProjectId, loadProjects]
  )

  const duplicateProject = useCallback(
    async (id) => {
      try {
        const original = await storageRef.current.read(id)
        if (!original) return null

        const newId = generateId()
        const now = new Date().toISOString()
        const copy = {
          ...original,
          title: `${original.title || 'Untitled'} (Copy)`,
          createdAt: now,
          updatedAt: now,
        }
        copy.id = newId
        await storageRef.current.create(newId, copy)
        await loadProjects()
        return newId
      } catch (e) {
        console.error('Duplicate project failed:', e)
        return null
      }
    },
    [loadProjects]
  )

  const deleteProject = useCallback(
    async (id) => {
      try {
        await storageRef.current.remove(id)
        if (id === currentProjectId && mountedRef.current) {
          setCurrentProjectId(null)
          setCurrentProjectTitle('')
          stateRef.current = null
          isDirtyRef.current = false
        }
        await loadProjects()
      } catch (e) {
        console.error('Delete project failed:', e)
      }
    },
    [currentProjectId, loadProjects]
  )

  const closeProject = useCallback(async () => {
    // Save pending changes before closing
    if (isDirtyRef.current && projectIdRef.current) {
      await saveCurrentProject()
    }
    isDirtyRef.current = false
    stateRef.current = null
    if (mountedRef.current) {
      setCurrentProjectId(null)
      setCurrentProjectTitle('')
    }
  }, [saveCurrentProject])

  return {
    currentProjectId,
    currentProjectTitle,
    projects,
    isSaving,
    updateState,
    createProject,
    openProject,
    renameProject,
    duplicateProject,
    deleteProject,
    closeProject,
    loadProjects,
  }
}
