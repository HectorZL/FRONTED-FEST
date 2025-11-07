import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeliculasService, Pelicula } from '../../../services/peliculas.service';
import { Modal, PeliculaForm } from '../../util/modal/modal';
import { Subscription } from 'rxjs';

// Local interface for the form data
export interface PeliculaFormData extends Omit<Pelicula, 'id'> {}

// Local interface for the UI
interface PeliculaUI extends Pelicula {
  procesandoEstado?: boolean;
}

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
    if (!pelicula.id) {
      console.error('No se puede actualizar el estado: ID de película no válido');
      return;
    }
    
    const nuevoEstado = !pelicula.estado;
    
    this.peliculasService.actualizarEstadoPelicula(pelicula.id, nuevoEstado).subscribe({
      next: (result) => {
        if (!result.success) {
          // Revertir el cambio en la UI si hay un error
          pelicula.estado = !nuevoEstado;
          console.error('Error al actualizar el estado:', result.error);
          alert(`Error al actualizar el estado: ${result.error}`);
        } else {
          console.log('Estado actualizado correctamente');
        }
      },
      error: (error) => {
        // Revertir el cambio en la UI
        pelicula.estado = !nuevoEstado;
        console.error('Error al actualizar el estado:', error);
        alert('Ocurrió un error al actualizar el estado de la película');
      }
    });
  }

  editarPelicula(pelicula: PeliculaUI) {
    this.abrirModal(pelicula);
  }

  eliminarPelicula(id: number) {
    if (confirm('¿Estás seguro de eliminar esta película?')) {
      this.peliculasService.eliminarPelicula(id).subscribe({
        next: (result) => {
          if (result.success) {
            // La eliminación se maneja automáticamente por la suscripción a peliculas$
            console.log('Película eliminada exitosamente');
          } else {
            alert(`Error al eliminar la película: ${result.error}`);
          }
        },
        error: (error) => {
          console.error('Error al eliminar la película:', error);
          alert('Ocurrió un error al intentar eliminar la película');
        }
      });
    }
  }

  get peliculasFiltradas() {
    if (!this.filtroBusqueda || this.filtroBusqueda.trim() === '') {
      return this.peliculas;
    }
    
    const busqueda = this.filtroBusqueda.trim().toLowerCase();
    return this.peliculas.filter(pelicula => {
      // Verificar si alguna propiedad de la película coincide con la búsqueda
      return (
        (pelicula.titulo && pelicula.titulo.toLowerCase().includes(busqueda)) ||
        (pelicula.sinopsis && pelicula.sinopsis.toLowerCase().includes(busqueda)) ||
        (pelicula.clasificacion && pelicula.clasificacion.toLowerCase().includes(busqueda)) ||
        (pelicula.genero && Array.isArray(pelicula.genero) && 
         pelicula.genero.some(g => g && g.toLowerCase().includes(busqueda)))
      );
    });
  }

  formatearDuracion(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins.toString().padStart(2, '0')}m`;
    return `${horas}h ${mins}m`;
  }
}