"use client";

import React, { useContext } from "react";
import Navbar from "./Navbar";
import SideMenu from "./SideMenu";
import { UserContext } from "~/context/UserContext";

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeMenu: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, activeMenu }) => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("DashboardLayout must be used within a UserProvider");
  }
  const { user } = context;

  return (
    <div className="">
      <Navbar activeMenu={activeMenu} />

      {user && (
        <div className="flex">
          <div className="max-[1080px]:hidden">
            <SideMenu activeMenu={activeMenu} />
          </div>

          <div className="grow mx-5">{children}</div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;