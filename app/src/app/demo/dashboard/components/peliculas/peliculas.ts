import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeliculasService, Pelicula } from '../../../services/peliculas.service';
import { Modal, PeliculaForm } from '../../util/modal/modal';
import { Subscription } from 'rxjs';

// Local interface for the form data
export interface PeliculaFormData extends Omit<Pelicula, 'id'> {}

// Local interface for the UI
type PeliculaUI = Pelicula;

@Component({
  selector: 'app-peliculas',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal],
  templateUrl: './peliculas.html',
  styleUrls: ['./peliculas.scss']
})

export class Peliculas implements OnInit, OnDestroy {
  mostrarModal = false;
  peliculas: PeliculaUI[] = [];
  filtroBusqueda: string = '';
  
  // Current movie being edited
  pelicula: PeliculaUI | null = null;
  
  private peliculasSubscription: Subscription | null = null;
  
  constructor(private peliculasService: PeliculasService) {}
  
  ngOnInit() {
    this.cargarPeliculas();
  }
  
  ngOnDestroy() {
    if (this.peliculasSubscription) {
      this.peliculasSubscription.unsubscribe();
    }
  }
  
  private cargarPeliculas() {
    this.peliculasSubscription = this.peliculasService.getListaPeliculas().subscribe({
      next: (peliculas: Pelicula[]) => {
        this.peliculas = peliculas;
      },
      error: (error) => {
        console.error('Error al cargar películas:', error);
      }
    });
  }

  abrirModal(pelicula?: PeliculaUI) {
    if (pelicula) {
      // Edit mode
      this.pelicula = { ...pelicula };
    } else {
      // Add mode
      this.pelicula = {
        titulo: '',
        sinopsis: '',
        duracion: 0,
        clasificacion: '',
        genero: [],
        imagenUrl: 'https://images.unsplash.com/photo-1489599809505-7c8e1a43cc32?w=400',
        estado: true
      };
    }
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.pelicula = null;
  }

  onPeliculaGuardada(peliculaForm: PeliculaForm) {
    const peliculaData: PeliculaFormData = {
      titulo: peliculaForm.titulo,
      sinopsis: peliculaForm.sinopsis,
      duracion: peliculaForm.duracion || 0,
      clasificacion: peliculaForm.clasificacion,
      genero: peliculaForm.genero,
      imagenUrl: peliculaForm.imagenUrl,
      estado: peliculaForm.estado
    };

    if (this.pelicula?.id) {
      // Update existing movie
      // TODO: Implement update in the service
      console.log('Updating movie:', peliculaData);
    } else {
      // Add new movie
      this.peliculasService.agregarPelicula(peliculaData).subscribe({
        next: (peliculaCreada) => {
          this.peliculas = [...this.peliculas, peliculaCreada];
          this.cerrarModal();
        },
        error: (error) => {
          console.error('Error al guardar la película:', error);
        }
      });
    }
  }

  toggleEstado(pelicula: PeliculaUI) {
    // TODO: Implement status toggle in the service
    pelicula.estado = !pelicula.estado;
    console.log('Cambiando estado de la película:', pelicula);
  }

  editarPelicula(pelicula: PeliculaUI) {
    this.abrirModal(pelicula);
  }

  eliminarPelicula(id: number) {
    // TODO: Implement delete in the service
    if (confirm('¿Estás seguro de eliminar esta película?')) {
      this.peliculas = this.peliculas.filter(p => p.id !== id);
    }
  }

  get peliculasFiltradas() {
    if (!this.filtroBusqueda) {
      return this.peliculas;
    }
    const busqueda = this.filtroBusqueda.toLowerCase();
    return this.peliculas.filter(pelicula =>
      pelicula.titulo.toLowerCase().includes(busqueda) ||
      pelicula.genero.some(g => g.toLowerCase().includes(busqueda)) ||
      pelicula.clasificacion.toLowerCase().includes(busqueda) ||
      pelicula.sinopsis.toLowerCase().includes(busqueda)
    );
  }

  formatearDuracion(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins.toString().padStart(2, '0')}m`;
    return `${horas}h ${mins}m`;
  }
}