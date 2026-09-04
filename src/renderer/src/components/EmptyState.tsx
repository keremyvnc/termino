import { FolderPlus } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export function EmptyState() {
  const createProject = useAppStore((s) => s.createProject)
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <FolderPlus size={40} className="mb-4 text-muted/50" />
      <h2 className="mb-1 text-lg font-semibold">İlk projeni oluştur</h2>
      <p className="mb-5 max-w-sm text-sm text-muted">
        Bir proje; hazır komutları, ağ profilini ve tek tıkla açılan terminal oturumlarını bir
        arada tutar.
      </p>
      <button className="btn btn-primary" onClick={() => void createProject()}>
        <FolderPlus size={14} /> Yeni proje
      </button>
    </div>
  )
}
