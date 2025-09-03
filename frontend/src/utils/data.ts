import {
  LuLayoutDashboard,
  LuHandCoins,
  LuWalletMinimal,
  LuShieldAlert,
  LuLogOut,
} from "react-icons/lu";
import type { IconType } from "react-icons";

interface SideMenuItem {
  id: string;
  label: string;
  icon: IconType;
  path: string;
}

export const SIDE_MENU_DATA: SideMenuItem[] = [
  {
    id: "01",
    label: "Dashboard",
    icon: LuLayoutDashboard,
    path: "/dashboard",
  },
  {
    id: "02",
    label: "Income",
    icon: LuWalletMinimal,
    path: "/income",
  },
  {
    id: "03",
    label: "Expense",
    icon: LuHandCoins,
    path: "/expense",
  },
  {
    id: "04",
    label: "Anomalies",
    icon: LuShieldAlert,
    path: "/anomalies",
  },
  {
    id: "06",
    label: "Logout",
    icon: LuLogOut,
    path: "logout",
  },
];