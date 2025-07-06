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

  return (
    <div className="w-64 h-[calc(100vh-61px)] bg-white border-r border-gray-200/50 p-5 sticky top-[61px] z-20">
      <div className="flex flex-col items-center justify-center gap-3 mt-3 mb-7">
        {user?.profileImageUrl ? (
          <Image
            src={user.profileImageUrl}
            alt="Profile Image"
            width={80}
            height={80}
            className="w-20 h-20 bg-slate-400 rounded-full object-cover"
          />
        ) : (
          <CharAvatar
            fullName={user?.fullName ?? ""}
            width="w-20"
            height="h-20"
            style="text-xl"
          />
        )}

        <h5 className="text-gray-950 font-medium leading-6">
          {user?.fullName ?? ""}
        </h5>
      </div>

      {SIDE_MENU_DATA.map((item, index) => (
        <button
          key={`menu_${index}`}
          className={`w-full flex items-center gap-4 text-[15px] ${
            activeMenu == item.label ? "text-white bg-primary" : ""
          } py-3 px-6 rounded-lg mb-3`}
          onClick={() => handleClick(item.path)}
        >
          <item.icon className="text-xl" />
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default SideMenu;