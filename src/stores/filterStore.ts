import { create } from "zustand";
import type {
  FilterState,
  NodeType,
  FlowType,
  SearchMatch,
} from "../types";

interface FilterActions {
  setSearchQuery: (query: string) => void;
  toggleNodeType: (type: NodeType) => void;
  toggleFlowType: (type: FlowType) => void;
  toggleTag: (tag: string) => void;
  toggleGroup: (group: string) => void;
  setActiveNodeTypes: (types: NodeType[]) => void;
  setActiveFlowTypes: (types: FlowType[]) => void;
  setShowOrphaned: (show: boolean) => void;
  clearFilters: () => void;
  search: (nodes: any[]) => SearchMatch[];
}

const initialFilter: FilterState = {
  searchQuery: "",
  activeNodeTypes: [],
  activeFlowTypes: [],
  activeTags: [],
  activeGroups: [],
  showOrphaned: true,
  showHidden: false,
};

export const useFilterStore = create<FilterState & FilterActions>()(
  (set, get) => ({
    ...initialFilter,

    setSearchQuery: (query) => set({ searchQuery: query }),

    toggleNodeType: (type) =>
      set((s) => ({
        activeNodeTypes: s.activeNodeTypes.includes(type)
          ? s.activeNodeTypes.filter((t) => t !== type)
          : [...s.activeNodeTypes, type],
      })),

    toggleFlowType: (type) =>
      set((s) => ({
        activeFlowTypes: s.activeFlowTypes.includes(type)
          ? s.activeFlowTypes.filter((t) => t !== type)
          : [...s.activeFlowTypes, type],
      })),

    toggleTag: (tag) =>
      set((s) => ({
        activeTags: s.activeTags.includes(tag)
          ? s.activeTags.filter((t) => t !== tag)
          : [...s.activeTags, tag],
      })),

    toggleGroup: (group) =>
      set((s) => ({
        activeGroups: s.activeGroups.includes(group)
          ? s.activeGroups.filter((g) => g !== group)
          : [...s.activeGroups, group],
      })),

    setActiveNodeTypes: (types) => set({ activeNodeTypes: types }),
    setActiveFlowTypes: (types) => set({ activeFlowTypes: types }),
    setShowOrphaned: (show) => set({ showOrphaned: show }),

    clearFilters: () =>
      set({
        ...initialFilter,
      }),

    search: (nodes) => {
      const { searchQuery } = get();
      if (!searchQuery.trim()) return [];

      const query = searchQuery.toLowerCase();
      const matches: SearchMatch[] = [];

      for (const node of nodes) {
        const data = node.data || node;

        if (data.label?.toLowerCase().includes(query)) {
          matches.push({
            nodeId: node.id,
            label: data.label,
            type: data.nodeType || "page",
            matchField: "label",
            matchText: data.label,
          });
        }

        if (data.description?.toLowerCase().includes(query)) {
          matches.push({
            nodeId: node.id,
            label: data.label,
            type: data.nodeType || "page",
            matchField: "description",
            matchText: data.description,
          });
        }

        if (data.tags?.some((t: string) => t.toLowerCase().includes(query))) {
          const tag = data.tags.find((t: string) =>
            t.toLowerCase().includes(query)
          );
          matches.push({
            nodeId: node.id,
            label: data.label,
            type: data.nodeType || "page",
            matchField: "tag",
            matchText: tag,
          });
        }

        if (data.sourcePath?.toLowerCase().includes(query)) {
          matches.push({
            nodeId: node.id,
            label: data.label,
            type: data.nodeType || "page",
            matchField: "path",
            matchText: data.sourcePath,
          });
        }
      }

      return matches;
    },
  })
);
