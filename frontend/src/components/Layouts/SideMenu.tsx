"use client";

import React, { useContext } from "react";
import Image from "next/image";
import { SIDE_MENU_DATA } from "~/utils/data";
import { useRouter } from "next/navigation";
import { UserContext } from "~/context/UserContext";
import CharAvatar from "~/components/Cards/CharAvatar";
import { safeLocalStorage } from "~/utils/localStorage";

interface SideMenuProps {
  activeMenu: string;
}

const SideMenu: React.FC<SideMenuProps> = ({ activeMenu }) => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("SideMenu must be used within a UserProvider");
  }
  const { user, clearUser } = context;

  const router = useRouter();

  const handleClick = (route: string) => {
    if (route === "logout") {
      handelLogout();
      return;
    }

    router.push(route);
  };

  const handelLogout = () => {
    safeLocalStorage.clear();
    clearUser();
    router.push("/login");
  };

  // Separate menu items and logout
  const menuItems = SIDE_MENU_DATA.filter((item) => item.label !== "Logout");
  const logoutItem = SIDE_MENU_DATA.find((item) => item.label === "Logout");

  return (
    <div className="sticky top-[61px] z-20 flex h-[calc(100vh-61px)] w-64 flex-col border-r border-gray-200/50 bg-white p-5">
      <div className="mt-3 mb-7 flex flex-col items-center justify-center gap-3">
        {user?.profileImageUrl ? (
          <Image
            src={user.profileImageUrl}
            alt="Profile Image"
            width={80}
            height={80}
            className="h-20 w-20 rounded-full bg-slate-400 object-cover"
          />
        ) : (
          <CharAvatar
            fullName={user?.fullName ?? ""}
            width="w-20"
            height="h-20"
            style="text-xl"
          />
        )}

        <h5 className="leading-6 font-medium text-gray-950">
          {user?.fullName ?? ""}
        </h5>
      </div>

      {/* Main menu items */}
      <div className="flex-1">
        {menuItems.map((item, index) => (
          <button
            key={`menu_${index}`}
            className={`mb-3 flex w-full items-center gap-4 rounded-lg px-6 py-3 text-[15px] transition-all duration-200 ease-in-out ${
              activeMenu === item.label
                ? "bg-primary scale-[1.02] transform text-white shadow-lg shadow-purple-600/20"
                : "hover:text-primary text-gray-700 hover:translate-x-1 hover:scale-[1.02] hover:transform hover:bg-purple-50 hover:shadow-md hover:shadow-purple-100"
            }`}
            onClick={() => handleClick(item.path)}
          >
            <item.icon className="text-xl" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Logout button at bottom */}
      {logoutItem && (
        <div className="mt-auto border-t border-gray-200/50 pt-4">
          <button
            className="flex w-full items-center gap-4 rounded-lg px-6 py-3 text-[15px] text-red-600 transition-all duration-200 ease-in-out hover:translate-x-1 hover:scale-[1.02] hover:transform hover:bg-red-50 hover:text-red-700 hover:shadow-md hover:shadow-red-100"
            onClick={() => handleClick(logoutItem.path)}
          >
            <logoutItem.icon className="text-xl" />
            {logoutItem.label}
          </button>
        </div>
      )}
    </div>
  );
};

export default SideMenu;
