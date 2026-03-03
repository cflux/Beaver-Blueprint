import { createContext, useContext } from 'react';

export const SidebarContext = createContext<{ refreshSidebar: () => void }>({
  refreshSidebar: () => {},
});

export const useSidebar = () => useContext(SidebarContext);
