import {
  MdDashboard,
  MdRestaurantMenu,
  MdTableRestaurant,
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
import { FaCalendarAlt } from "react-icons/fa";

const menuSections = [
  {
    title: "Inicio",
    items: [
      { title: "Dashboard", icon: MdDashboard, path: "/dashboard", roles: ["admin"] },
    ],
  },
  {
    title: "Operaciones",
    items: [
      { title: "Mesas y atenciones", icon: MdTableRestaurant, path: "/mesas", roles: ["admin", "caja", "mesero"] },
      { title: "Pedidos", icon: FaShoppingCart, path: "/pedidos", roles: ["admin"] },
      { title: "Menú", icon: MdRestaurantMenu, path: "/menu", roles: ["admin"] },
      { title: "Producción", icon: GiChefToque, path: "/produccion", roles: ["admin"] },
    ],
  },
  {
    title: "Reservas y eventos",
    items: [
      { title: "Reservas", icon: FaCalendarAlt, path: "/reservas", roles: ["admin", "caja"] },
      { title: "Reservas de platos", icon: FaCalendarAlt, path: "/reservas-platos/gestion", roles: ["admin", "caja"] },
      { title: "Eventos privados", icon: FaCalendarAlt, path: "/eventos-privados/gestion", roles: ["admin", "caja"] },
    ],
  },
  {
    title: "Clientes",
    items: [
      { title: "Clientes", icon: FaUserFriends, path: "/clientes", roles: ["admin"] },
      { title: "Saldos pensionados", icon: FaUserFriends, path: "/pensiones", roles: ["admin", "caja", "mesero"] },
    ],
  },
  {
    title: "Inventario",
    items: [
      { title: "Productos", icon: MdRestaurantMenu, path: "/productos", roles: ["admin"] },
    ],
  },
  {
    title: "Finanzas",
    items: [
      { title: "Caja", icon: MdPointOfSale, path: "/caja", roles: ["admin", "caja"] },
    ],
  },
  {
    title: "Reportes",
    items: [
      { title: "Reportes", icon: FaChartBar, path: "/reportes", roles: ["admin"] },
    ],
  },
  {
    title: "Administración",
    items: [
      { title: "Usuarios", icon: FaUsers, path: "/usuarios", roles: ["admin"] },
      { title: "Configuración", icon: FaCog, path: "/configuracion", roles: ["admin"] },
    ],
  },
];

export default menuSections;