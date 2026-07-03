import {
  MdDashboard,
  MdRestaurantMenu,
} from "react-icons/md";

import {
  FaUsers,
  FaUserFriends,
  FaShoppingCart,
  FaChartBar,
  FaCog,
} from "react-icons/fa";

import { GiChefToque } from "react-icons/gi";
import { MdPointOfSale } from "react-icons/md";

const menuItems = [
  {
    title: "Dashboard",
    icon: MdDashboard,
    path: "/dashboard",
  },
  {
    title: "Usuarios",
    icon: FaUsers,
    path: "/usuarios",
  },
  {
    title: "Personas",
    icon: FaUserFriends,
    path: "/personas",
  },
  {
    title: "Menú",
    icon: MdRestaurantMenu,
    path: "/menu",
  },
  {
    title: "Pedidos",
    icon: FaShoppingCart,
    path: "/pedidos",
  },
  {
    title: "Caja",
    icon: MdPointOfSale,
    path: "/caja",
  },
  {
    title: "Cocina",
    icon: GiChefToque,
    path: "/cocina",
  },
  {
    title: "Reportes",
    icon: FaChartBar,
    path: "/reportes",
  },
  {
    title: "Configuración",
    icon: FaCog,
    path: "/configuracion",
  },
];

export default menuItems;