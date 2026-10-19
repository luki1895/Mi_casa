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
    roles: ["admin"],
  },
  {
    title: "Usuarios",
    icon: FaUsers,
    path: "/usuarios",
    roles: ["admin"],
  },
  {
    title: "Clientes",
    icon: FaUserFriends,
    path: "/clientes",
    roles: ["admin"],
  },
  {
    title: "Menú",
    icon: MdRestaurantMenu,
    path: "/menu",
    roles: ["admin"],
  },
  {
    title: "Pedidos",
    icon: FaShoppingCart,
    path: "/pedidos",
    roles: ["admin"],
  },
  {
    title: "Caja",
    icon: MdPointOfSale,
    path: "/caja",
    roles: ["admin", "caja"],
  },
  {
    title: "Producción",
    icon: GiChefToque,
    path: "/produccion",
    roles: ["admin"],
  },
  {
    title: "Reportes",
    icon: FaChartBar,
    path: "/reportes",
    roles: ["admin"],
  },
  {
    title: "Configuración",
    icon: FaCog,
    path: "/configuracion",
    roles: ["admin"],
  },
];

export default menuItems;