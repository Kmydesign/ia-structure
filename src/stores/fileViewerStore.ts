import { create } from "zustand";

interface OpenFile {
  path: string;
  relativePath: string;
  name: string;
  content: string;
}

interface FileViewerState {
  openFiles: OpenFile[];
  activeFilePath: string | null;
  isOpen: boolean;
}

interface FileViewerActions {
  openFile: (file: OpenFile) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string) => void;
  closeAll: () => void;
}

const initialState: FileViewerState = {
  openFiles: [],
  activeFilePath: null,
  isOpen: false,
};

export const useFileViewerStore = create<FileViewerState & FileViewerActions>()(
  (set, get) => ({
    ...initialState,

    openFile: (file) => {
      const { openFiles } = get();
      const exists = openFiles.some((f) => f.path === file.path);
      if (!exists) {
        set({
          openFiles: [...openFiles, file],
          activeFilePath: file.path,
          isOpen: true,
        });
      } else {
        set({ activeFilePath: file.path, isOpen: true });
      }
    },

    closeFile: (path) => {
      const { openFiles, activeFilePath } = get();
      const remaining = openFiles.filter((f) => f.path !== path);
      const newActive =
        activeFilePath === path
          ? remaining.length > 0
            ? remaining[remaining.length - 1].path
            : null
          : activeFilePath;
      set({
        openFiles: remaining,
        activeFilePath: newActive,
        isOpen: remaining.length > 0,
      });
    },

    setActiveFile: (path) => set({ activeFilePath: path }),

    closeAll: () => set(initialState),
  })
);
