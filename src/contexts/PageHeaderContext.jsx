import React, { createContext, useContext, useState } from 'react';

const PageHeaderContext = createContext(null);

export const PageHeaderProvider = ({ children }) => {
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  return (
    <PageHeaderContext.Provider value={{ breadcrumbs, setBreadcrumbs }}>
      {children}
    </PageHeaderContext.Provider>
  );
};

export const usePageHeader = () => useContext(PageHeaderContext);
