import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FuncionCarteleraService, FuncionCartelera } from '../../../services/funciones-cartelera.service';
import { Subscription } from 'rxjs';

interface Banner {
  titulo: string;
  subtitulo: string;
  imageUrl: string;
  bgColor: string;
  peliculaId: number;
  sinopsis: string;
}

interface Asiento {
  asiento_id: number;
  fila: string;
  numero: number;
  tipo_asiento: string;
  estado_asiento: string;
  seleccionado?: boolean;
}

@Component({
  selector: 'app-client-header',
  imports: [CommonModule, FormsModule],
  templateUrl: './client-header.html',
  styleUrl: './client-header.scss',
})
export class ClientHeader implements OnInit, OnDestroy {
  // Estados principales
  pasoActual: 'cartelera' | 'asientos' | 'confirmacion' = 'cartelera';

  // Datos
  peliculas: FuncionCartelera[] = [];
  funcionesFuturas: FuncionCartelera[] = [];
  private peliculasSubscription!: Subscription;
  private funcionesSubscription!: Subscription;

  // Banners
  banners: Banner[] = [];
  currentBannerIndex = 0;
  private bannerInterval: any;

  // Selecciones del usuario
  funcionSeleccionada: FuncionCartelera | null = null;
  asientosDisponibles: Asiento[] = [];
  asientosSeleccionados: Asiento[] = [];

  // Filtros
  filtroGenero = '';
  filtroBusqueda = '';
  filtroSala = '';

  // SIMULACIÓN: Usuario ya logeado
  isLoggedIn = true;
  usuarioId = 1;

  constructor(private funcionCarteleraService: FuncionCarteleraService) {}

  ngOnInit() {
    this.cargarDatos();
    this.iniciarCarrusel();
  }

  ngOnDestroy() {
    if (this.peliculasSubscription) {
      this.peliculasSubscription.unsubscribe();
    }
    if (this.funcionesSubscription) {
      this.funcionesSubscription.unsubscribe();
    }
    if (this.bannerInterval) {
      clearInterval(this.bannerInterval);
    }
  }

  private cargarDatos() {
    this.peliculasSubscription = this.funcionCarteleraService.getAllPeliculas().subscribe(
      (peliculas) => {
        this.peliculas = peliculas;
        this.actualizarBanners();
      },
      (error) => {
        console.error('Error al cargar películas:', error);
        this.peliculas = this.getPeliculasEjemplo();
        this.actualizarBanners();
      }
    );

    this.funcionesSubscription = this.funcionCarteleraService.getFuncionesFuturas().subscribe(
      (funciones) => {
        this.funcionesFuturas = funciones;
      },
      (error) => {
        console.error('Error al cargar funciones futuras:', error);
        this.funcionesFuturas = this.getFuncionesFuturasEjemplo();
      }
    );
  }

  // ========== FLUJO DE RESERVA ==========

  seleccionarFuncion(funcion: FuncionCartelera) {
    this.funcionSeleccionada = funcion;
    this.cargarAsientosDisponibles(funcion.sala.id, funcion.id);
    this.pasoActual = 'asientos';
  }

  private cargarAsientosDisponibles(salaId: number, funcionId: number) {
    this.asientosDisponibles = this.generarAsientosEjemplo(salaId);
    this.asientosSeleccionados = [];
  }

  seleccionarAsiento(asiento: Asiento) {
    if (asiento.estado_asiento !== 'disponible') return;

    const index = this.asientosSeleccionados.findIndex(a =>
      a.asiento_id === asiento.asiento_id
    );

    if (index > -1) {
      this.asientosSeleccionados.splice(index, 1);
      asiento.seleccionado = false;
    } else {
      this.asientosSeleccionados.push(asiento);
      asiento.seleccionado = true;
    }
  }

  confirmarAsientos() {
    if (this.asientosSeleccionados.length === 0) {
      alert('Por favor selecciona al menos un asiento');
      return;
    }
    this.pasoActual = 'confirmacion';
  }

  finalizarReserva() {
    if (!this.funcionSeleccionada || this.asientosSeleccionados.length === 0) return;

    const asientosTexto = this.asientosSeleccionados
      .map(a => `${a.fila}${a.numero}`)
      .join(', ');

    alert(`🎉 ¡Reserva exitosa!\n\nPelícula: ${this.funcionSeleccionada.pelicula.titulo}\nSala: ${this.funcionSeleccionada.sala.nombre}\nAsientos: ${asientosTexto}\nFecha: ${this.formatearFecha(this.funcionSeleccionada.inicio)}\nHora: ${this.formatearHora(this.funcionSeleccionada.inicio)}`);

    this.generarQRCode();
    this.reiniciarFlujo();
  }

  volverACartelera() {
    this.reiniciarFlujo();
  }

  volverAAsientos() {
    this.pasoActual = 'asientos';
  }

  private reiniciarFlujo() {
    this.pasoActual = 'cartelera';
    this.funcionSeleccionada = null;
    this.asientosSeleccionados = [];
    this.asientosDisponibles = [];
  }

  // ========== MÉTODOS AUXILIARES ==========

  private generarAsientosEjemplo(salaId: number): Asiento[] {
    const asientos: Asiento[] = [];
    const filas = ['A', 'B', 'C', 'D', 'E'];
    let idCounter = 1;

    filas.forEach(fila => {
      for (let numero = 1; numero <= 10; numero++) {
        const estado = Math.random() > 0.7 ? 'ocupado' : 'disponible';

        asientos.push({
          asiento_id: idCounter++,
          fila: fila,
          numero: numero,
          tipo_asiento: 'Estandar',
          estado_asiento: estado,
          seleccionado: false
        });
      }
    });

    return asientos;
  }

  private generarQRCode() {
    const qrData = {
      pelicula: this.funcionSeleccionada?.pelicula.titulo,
      sala: this.funcionSeleccionada?.sala.nombre,
      asientos: this.asientosSeleccionados.map(a => `${a.fila}${a.numero}`),
      fecha: this.funcionSeleccionada?.inicio,
      usuario: this.usuarioId
    };

    console.log('QR Generado:', qrData);
  }

  getClaseAsiento(asiento: Asiento): string {
    const base = 'w-8 h-8 rounded transition-all duration-200 font-bold text-xs ';

    if (asiento.estado_asiento !== 'disponible') {
      return base + 'bg-red-500 cursor-not-allowed opacity-50';
    }

    if (asiento.seleccionado) {
      return base + 'bg-cyan-500 text-white transform scale-110';
    }

    return base + 'bg-green-500 text-white hover:bg-green-400';
  }

  get asientosAgrupados(): Asiento[][] {
    const agrupados = new Map<string, Asiento[]>();

    this.asientosDisponibles.forEach(asiento => {
      if (!agrupados.has(asiento.fila)) {
        agrupados.set(asiento.fila, []);
      }
      agrupados.get(asiento.fila)!.push(asiento);
    });

    return Array.from(agrupados.values());
  }

  // ========== MÉTODOS EXISTENTES ==========

  private getPeliculasEjemplo(): FuncionCartelera[] {
    return [
      {
        id: 2,
        precio: 0,
        inicio: new Date('2025-11-08T17:30:00'),
        fin: new Date('2025-11-08T20:18:00'),
        estado: 'Programada',
        pelicula: {
          id: 2,
          titulo: 'Inception',
          sinopsis: 'Un ladrón que roba secretos corporativos a través de la tecnología de sueños se enfrenta a su misión más peligrosa: implantar una idea en la mente de un CEO.',
          duracionMin: 148,
          clasificacion: 'PG-13',
          generos: ['Ciencia ficción', 'Suspenso'],
          posterUrl: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
          estadoActiva: true
        },
        sala: {
          id: 2,
          nombre: 'Sala 2 - 3D/Premium',
          tipo: '3D',
          capacidad: 50
        }
      },
      {
        id: 3,
        precio: 0,
        inicio: new Date('2025-11-08T21:00:00'),
        fin: new Date('2025-11-09T00:15:00'),
        estado: 'Programada',
        pelicula: {
          id: 3,
          titulo: 'Titanic',
          sinopsis: 'Una joven de la alta sociedad se enamora de un artista humilde a bordo del trágico barco Titanic.',
          duracionMin: 195,
          clasificacion: 'PG-13',
          generos: ['Romance', 'Drama'],
          posterUrl: 'https://image.tmdb.org/t/p/w500/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg',
          estadoActiva: true
        },
        sala: {
          id: 3,
          nombre: 'Sala 3 - VIP Doble',
          tipo: 'VIP',
          capacidad: 20
        }
      }
    ];
  }

  private getFuncionesFuturasEjemplo(): FuncionCartelera[] {
    return this.getPeliculasEjemplo();
  }

  private actualizarBanners() {
    const coloresBanners = [
      'bg-gradient-to-r from-purple-600/80 via-blue-600/70 to-transparent',
      'bg-gradient-to-r from-rose-600/80 via-pink-600/70 to-transparent',
      'bg-gradient-to-r from-cyan-600/80 via-teal-600/70 to-transparent',
      'bg-gradient-to-r from-orange-600/80 via-red-600/70 to-transparent'
    ];

    this.banners = this.peliculas.slice(0, 4).map((pelicula, index) => ({
      titulo: pelicula.pelicula.titulo,
      subtitulo: 'DISPONIBLE EN VARIAS SALAS',
      imageUrl: pelicula.pelicula.posterUrl,
      bgColor: coloresBanners[index % coloresBanners.length],
      peliculaId: pelicula.pelicula.id,
      sinopsis: pelicula.pelicula.sinopsis
    }));

    if (this.banners.length === 0) {
      this.banners = [
        {
          titulo: 'ULEAM CINE',
          subtitulo: 'RESERVA TU PELÍCULA FAVORITA',
          imageUrl: 'https://images.unsplash.com/photo-1489599809505-7c8e1a43cc32?w=1280',
          bgColor: 'bg-gradient-to-r from-purple-600/80 via-blue-600/70 to-transparent',
          peliculaId: 0,
          sinopsis: 'Sistema de reservas de cine para la comunidad ULEAM'
        }
      ];
    }
  }

  private iniciarCarrusel() {
    this.bannerInterval = setInterval(() => {
      this.nextBanner();
    }, 5000);
  }

  // Getters
  get generosUnicos(): string[] {
    const generos = this.peliculas.flatMap(p => p.pelicula.generos);
    return [...new Set(generos)].sort();
  }

  get salasUnicas(): string[] {
    const salas = this.funcionesFuturas.map(f => f.sala.nombre);
    return [...new Set(salas)].sort();
  }

  get peliculasUnicas(): FuncionCartelera[] {
    return this.peliculasFiltradas.reduce((unique: FuncionCartelera[], pelicula) => {
      if (!unique.find(p => p.pelicula.id === pelicula.pelicula.id)) {
        unique.push(pelicula);
      }
      return unique;
    }, []);
  }

  get peliculasFiltradas(): FuncionCartelera[] {
    return this.peliculas.filter(pelicula => {
      const coincideGenero = !this.filtroGenero ||
        pelicula.pelicula.generos.includes(this.filtroGenero);
      const coincideBusqueda = !this.filtroBusqueda ||
        pelicula.pelicula.titulo.toLowerCase().includes(this.filtroBusqueda.toLowerCase()) ||
        pelicula.pelicula.sinopsis.toLowerCase().includes(this.filtroBusqueda.toLowerCase());

      return coincideGenero && coincideBusqueda;
    });
  }

  getFuncionesPorPelicula(peliculaId: number): FuncionCartelera[] {
    return this.funcionesFuturas.filter(f => f.pelicula.id === peliculaId);
  }

  // Navegación del banner
  nextBanner() {
    this.currentBannerIndex = (this.currentBannerIndex + 1) % this.banners.length;
    this.reiniciarCarrusel();
  }

  prevBanner() {
    this.currentBannerIndex = (this.currentBannerIndex - 1 + this.banners.length) % this.banners.length;
    this.reiniciarCarrusel();
  }

  private reiniciarCarrusel() {
    if (this.bannerInterval) {
      clearInterval(this.bannerInterval);
    }
    this.iniciarCarrusel();
  }

  goToBanner(index: number) {
    this.currentBannerIndex = index;
    this.reiniciarCarrusel();
  }

  // Métodos del banner (mantener compatibilidad)
  reservarFuncion(funcion: FuncionCartelera) {
    this.seleccionarFuncion(funcion);
  }

  obtenerFuncionesDisponibles(peliculaId: number): FuncionCartelera[] {
    return this.funcionesFuturas.filter(f => f.pelicula.id === peliculaId);
  }

  // Formateadores
  formatearDuracion(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}m`;
  }

  formatearFecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatearHora(fecha: Date): string {
    return fecha.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatearPrecio(precio: number): string {
    return 'GRATIS';
  }
}
