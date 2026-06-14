import useScannerStore from '../features/scanner/hooks/useScannerStore'
import ScannerPreview from '../features/scanner/components/ScannerPreview'
import ControlPanel from '../features/scanner/components/ControlPanel'

export default function DocumentCleaner() {
  const store = useScannerStore()
  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      <ScannerPreview store={store} />
      <ControlPanel store={store} />
    </div>
  )
}
