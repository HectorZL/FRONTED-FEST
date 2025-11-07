import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { BoletosService, BoletoCompleto, EstadisticasBoletos, CrearBoletoData } from '../../../services/boleto.service';

@Component({
  selector: 'app-boletos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './boletos.html'
})
export class BoletosComponent implements OnInit, OnDestroy {
  cargando = false;
  private subscriptions: Subscription = new Subscription();

  boletos: BoletoCompleto[] = [];
  boletosFiltrados: BoletoCompleto[] = [];
  estadisticas: EstadisticasBoletos | null = null;
  funcionesDisponibles: any[] = [];

  // Filtros
  filtroPelicula: string = '';
  filtroFecha: string = '';
  filtroVentas: string = 'todos';

  // Modal crear boleto
  mostrarModalCrear = false;
  nuevoBoleto: CrearBoletoData = {
    funcion_id: 0,
    precio_pagado: 0
  };

  constructor(private boletosService: BoletosService) { }

  ngOnInit() {
    this.cargarDatos();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  cargarDatos() {
    this.cargando = true;

    // Cargar boletos
    this.subscriptions.add(
      this.boletosService.boletos$.subscribe({
        next: (boletos) => {
          this.boletos = boletos;
          this.aplicarFiltros();
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error al cargar boletos:', error);
          this.cargando = false;
        }
      })
    );

    // Cargar estadísticas
    this.cargarEstadisticas();

    // Cargar funciones disponibles
    this.cargarFuncionesDisponibles();
  }

  cargarEstadisticas() {
    this.subscriptions.add(
      this.boletosService.getEstadisticasBoletos().subscribe({
        next: (estadisticas) => {
          this.estadisticas = estadisticas;
        },
        error: (error) => {
          console.error('Error al cargar estadísticas:', error);
        }
      })
    );
  }

  cargarFuncionesDisponibles() {
    this.subscriptions.add(
      this.boletosService.getFuncionesDisponibles().subscribe({
        next: (funciones) => {
          this.funcionesDisponibles = funciones;
        },
        error: (error) => {
          console.error('Error al cargar funciones:', error);
        }
      })
    );
  }

  aplicarFiltros() {
    console.log('Aplicando filtros:', {
      pelicula: this.filtroPelicula,
      fecha: this.filtroFecha,
      ventas: this.filtroVentas
    });

    this.boletosFiltrados = this.boletos.filter(boleto => {
      // Filtro por película - CORREGIDO
      let coincidePelicula = true;
      if (this.filtroPelicula) {
        const tituloPelicula = this.obtenerTituloPelicula(boleto);
        coincidePelicula = tituloPelicula.toLowerCase().includes(this.filtroPelicula.toLowerCase());
      }

      // Filtro por fecha de función - CORREGIDO
      let coincideFecha = true;
      if (this.filtroFecha) {
        const fechaFuncion = this.obtenerFechaFuncion(boleto);
        coincideFecha = fechaFuncion.startsWith(this.filtroFecha);
      }

      // Filtro por ventas
      const totalVendidos = boleto.metricas?.total_vendidos || 0;
      let coincideVentas = true;
      
      switch (this.filtroVentas) {
        case 'con-ventas':
          coincideVentas = totalVendidos > 0;
          break;
        case 'sin-ventas':
          coincideVentas = totalVendidos === 0;
          break;
        case 'populares':
          coincideVentas = totalVendidos >= 10;
          break;
      }

      const resultado = coincidePelicula && coincideFecha && coincideVentas;
      
      if (resultado) {
        console.log('Boleto coincide:', {
          id: boleto.boleto_id,
          pelicula: this.obtenerTituloPelicula(boleto),
          fecha: this.obtenerFechaFuncion(boleto),
          ventas: totalVendidos
        });
      }

      return resultado;
    });

    console.log('Resultados filtrados:', this.boletosFiltrados.length);
  }

  // MÉTODOS AUXILIARES PARA OBTENER DATOS - NUEVOS
  private obtenerTituloPelicula(boleto: BoletoCompleto): string {
    // Intenta obtener el título de diferentes formas
    return boleto.funcion?.pelicula_titulo || 
           boleto.funcion?.pelicula?.titulo || 
           'Película no disponible';
  }

  private obtenerFechaFuncion(boleto: BoletoCompleto): string {
    // Asegura que tenemos una fecha válida
    const fecha = boleto.funcion?.fecha_hora_inicio;
    if (!fecha) return '';
    
    // Convierte a formato ISO para el filtro por fecha
    try {
      return new Date(fecha).toISOString().split('T')[0];
    } catch (error) {
      console.error('Error al parsear fecha:', fecha, error);
      return '';
    }
  }

  onFiltroChange() {
    this.aplicarFiltros();
  }

  // Modal crear boleto
  abrirModalCrearBoleto() {
    this.nuevoBoleto = {
      funcion_id: 0,
      precio_pagado: 0
    };
    this.mostrarModalCrear = true;
  }

  cerrarModalCrear() {
    this.mostrarModalCrear = false;
    this.nuevoBoleto = {
      funcion_id: 0,
      precio_pagado: 0
    };
  }

  confirmarCrearBoleto() {
    if (!this.nuevoBoleto.funcion_id || !this.nuevoBoleto.precio_pagado) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    this.subscriptions.add(
      this.boletosService.crearBoleto(this.nuevoBoleto).subscribe({
        next: (boletoCreado) => {
          console.log('Boleto creado exitosamente:', boletoCreado);
          this.cerrarModalCrear();
          alert('Boleto base creado exitosamente');
        },
        error: (error) => {
          console.error('Error al crear boleto:', error);
          alert('Error al crear boleto: ' + error.message);
        }
      })
    );
  }

  // Eliminar boleto
  eliminarBoleto(boletoId: number) {
    if (confirm('¿Está seguro de que desea eliminar este boleto base? Esta acción no se puede deshacer.')) {
      this.subscriptions.add(
        this.boletosService.eliminarBoleto(boletoId).subscribe({
          next: () => {
            console.log('Boleto eliminado exitosamente');
            alert('Boleto base eliminado exitosamente');
          },
          error: (error) => {
            console.error('Error al eliminar boleto:', error);
            alert('Error al eliminar boleto: ' + error.message);
          }
        })
      );
    }
  }

  // Ver detalles
  verDetallesBoleto(boleto: BoletoCompleto) {
    const detalles = `
      ID: #${boleto.boleto_id}
      Película: ${this.obtenerTituloPelicula(boleto)}
      Sala: ${boleto.funcion?.sala_nombre || 'N/A'}
      Fecha Función: ${this.formatearFecha(boleto.funcion?.fecha_hora_inicio || '')}
      Precio Base: ${this.formatearPrecio(boleto.precio_pagado)}
      QR: ${boleto.qr}
      
      Métricas:
      - Total Vendidos: ${boleto.metricas?.total_vendidos || 0}
      - Ingresos Totales: ${this.formatearPrecio(boleto.metricas?.ingresos_totales || 0)}
      - Asistencias Confirmadas: ${boleto.metricas?.asistencias_confirmadas || 0}
    `;
    alert(detalles);
  }

  // Generar QR
  generarQR(boleto: BoletoCompleto) {
    console.log('QR del boleto:', boleto.qr);
    alert(`QR del boleto #${boleto.boleto_id}:\n${boleto.qr}`);
  }

  // Limpiar filtros
  limpiarFiltros() {
    this.filtroPelicula = '';
    this.filtroFecha = '';
    this.filtroVentas = 'todos';
    this.aplicarFiltros();
  }

  tieneFiltrosActivos(): boolean {
    return !!this.filtroPelicula || !!this.filtroFecha || this.filtroVentas !== 'todos';
  }

  // Métodos auxiliares
  formatearFecha(fechaISO: string): string {
    if (!fechaISO) return 'N/A';
    return new Date(fechaISO).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatearPrecio(precio: number): string {
    return `$${precio.toFixed(2)}`;
  }

  // Descargar reporte
  descargarReporte() {
    const csvContent = this.convertirACSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_boletos_base_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private convertirACSV(): string {
    const headers = ['ID', 'Película', 'Sala', 'Fecha Función', 'Precio Base', 'Total Vendidos', 'Ingresos Totales', 'Asistencias', 'Fecha Creación', 'QR'];
    const rows = this.boletosFiltrados.map(boleto => [
      boleto.boleto_id,
      this.obtenerTituloPelicula(boleto),
      boleto.funcion?.sala_nombre || 'N/A',
      this.formatearFecha(boleto.funcion?.fecha_hora_inicio || ''),
      this.formatearPrecio(boleto.precio_pagado),
      boleto.metricas?.total_vendidos || 0,
      this.formatearPrecio(boleto.metricas?.ingresos_totales || 0),
      boleto.metricas?.asistencias_confirmadas || 0,
      this.formatearFecha(boleto.fecha_reserva),
      boleto.qr
    ]);

    return [headers, ...rows].map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');
  }
}