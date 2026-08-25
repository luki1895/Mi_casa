const hoy = new Date();

const fechaHace = (dias) => {
  const copia = new Date(hoy);
  copia.setDate(copia.getDate() - dias);
  return copia.toISOString().slice(0, 10);
};

export const inventarioInicial = [
  {
    id: 1,
    nombre: "arroz",
    unidades: 8,
    costoUnitario: 12.5,
    categoria: "granos",
    ultimaModificacion: fechaHace(2)
  },
  {
    id: 2,
    nombre: "tomate",
    unidades: 3,
    costoUnitario: 18,
    categoria: "verduras",
    ultimaModificacion: fechaHace(9)
  },
  {
    id: 3,
    nombre: "pollo",
    unidades: 15,
    costoUnitario: 52,
    categoria: "carnes",
    ultimaModificacion: fechaHace(1)
  }
];