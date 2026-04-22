export interface Producto {
  id: string
  sku: string
  nombre: string
  categoria: string
  descripcion?: string
  stock: number
  minimo: number
  stockMaximo: number
  precioUnitario: number
}