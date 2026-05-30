const generateFallbackResponse = (prompt) => {
  const subjectMatch = prompt.match(/المادة:\s*([^,]+)/)
  const gradeMatch   = prompt.match(/الصف:\s*([^,]+)/)
  const teacherMatch = prompt.match(/المعلم:\s*([^.]+)/)

  const subject = subjectMatch ? subjectMatch[1].trim() : 'المادة'
  const grade   = gradeMatch   ? gradeMatch[1].trim()   : ''
  const teacher = teacherMatch ? teacherMatch[1].trim() : ''

  const subjectTitles = {
    'الرياضيات':         ['سلسلة المتميز في الرياضيات',  'البروفيسور في الرياضيات',   'الرياضيات الذهبية'],
    'الفيزياء':          ['العبقري في الفيزياء',          'سلسلة تبسيط الفيزياء',      'الفيزياء في ثوبها الجديد'],
    'الكيمياء':          ['الرازي في الكيمياء',           'سلسلة التفوق الكيميائي',     'كيمياء الثانوية العامة'],
    'الأحياء':           ['الطبيب في الأحياء',            'ابن النفيس في الأحياء',      'سلسلة الحياة في الأحياء'],
    'اللغة العربية':     ['الضاد في اللغة العربية',       'الفاروق في اللغة العربية',   'المرشد اللغوي'],
    'اللغة الإنجليزية': ['The Legend in English',         'First Class English',        'English Zone'],
    'التاريخ':           ['المؤرخ في التاريخ',            'سلسلة عباقرة التاريخ',       'بوابة التاريخ'],
    'الجغرافيا':         ['سلسلة الجغرافي المحترف',       'الأطلس في الجغرافيا',        'الجغرافيا المبسطة'],
  }

  let titleList = [
    `سلسلة التميز والنجاح في ${subject}`,
    `مذكرة الدرجة النهائية في ${subject}`,
    `دليل الطالب الذكي في ${subject}`,
  ]
  for (const [key, list] of Object.entries(subjectTitles)) {
    if (subject.includes(key) || key.includes(subject)) {
      titleList = list
      break
    }
  }

  return {
    title:    titleList[Math.floor(Math.random() * titleList.length)],
    subtitle: grade && grade !== 'غير محدد'
      ? `${grade} - الفصل الدراسي الأول`
      : 'منهج العام الدراسي الجديد',
    author: teacher && teacher !== 'غير محدد'
      ? (teacher.startsWith('إعداد') ? teacher : `إعداد الأستاذ: ${teacher}`)
      : 'إعداد نخبة من المعلمين',
  }
}

export const callClaudeAPI = async (prompt) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    console.warn('VITE_GEMINI_API_KEY is not defined, using offline fallback.')
    return generateFallbackResponse(prompt)
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      }),
    })

    if (!res.ok) throw new Error(`Gemini API returned ${res.status}`)

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return JSON.parse(text.trim())

  } catch (err) {
    console.warn('Gemini API call failed, using offline fallback:', err)
    return generateFallbackResponse(prompt)
  }
}