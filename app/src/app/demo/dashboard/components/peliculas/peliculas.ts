import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../util/modal/modal';

interface Pelicula {
  id: number;
  titulo: string;
  sinopsis: string;
  duracion: number;
  clasificacion: string;
  genero: string[];
  imagenUrl: string;
  estado: boolean;
}

@Component({
  selector: 'app-peliculas',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal],
  templateUrl: './peliculas.html',
  styleUrls: ['./peliculas.scss']
})

export class Peliculas{
  mostrarModal = false;
  peliculas: Pelicula[] = [
    {
      id: 1,
      titulo: 'El Origen',
      sinopsis: 'Un ladrón que roba secretos corporativos mediante el uso de tecnología de sueños compartidos.',
      duracion: 148,
      clasificacion: 'PG-13',
      genero: ['Ciencia Ficción', 'Acción'],
      imagenUrl: 'https://images.unsplash.com/photo-1489599809505-7c8e1a43cc32?w=400',
      estado: true
    },
    {
      id: 2,
      titulo: 'El Padrino',
      sinopsis: 'La historia de una familia de la mafia italiana y su lucha por mantener el poder en el crimen organizado.',
      duracion: 175,
      clasificacion: 'R',
      genero: ['Drama', 'Crimen'],
      imagenUrl: 'https://images.unsplash.com/photo-1489599809505-7c8e1a43cc32?w=400',
      estado: true
    },
    {
      id: 3,
      titulo: 'Interestelar',
      sinopsis: 'Un grupo de exploradores viaja a través de un agujero de gusano en el espacio en un intento por asegurar la supervivencia de la humanidad.',
      duracion: 169,
      clasificacion: 'PG-13',
      genero: ['Ciencia Ficción', 'Aventura', 'Drama'],
      imagenUrl: 'https://images.unsplash.com/photo-1489599809505-7c8e1a43cc32?w=400',
      estado: false
    }
  ];

  filtroBusqueda: string = '';

  abrirModal() {
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
  }

  onPeliculaGuardada(nuevaPelicula: Omit<Pelicula, 'id'>) {
    const pelicula: Pelicula = {
      ...nuevaPelicula,
      id: this.peliculas.length + 1
    };
    this.peliculas.push(pelicula);
    this.cerrarModal();
  }

  toggleEstado(pelicula: Pelicula) {
    pelicula.estado = !pelicula.estado;
  }

  eliminarPelicula(id: number) {
    this.peliculas = this.peliculas.filter(p => p.id !== id);
  }

  get peliculasFiltradas() {
    if (!this.filtroBusqueda) {
      return this.peliculas;
    }
    return this.peliculas.filter(pelicula =>
      pelicula.titulo.toLowerCase().includes(this.filtroBusqueda.toLowerCase()) ||
      pelicula.genero.some(g => g.toLowerCase().includes(this.filtroBusqueda.toLowerCase())) ||
      pelicula.clasificacion.toLowerCase().includes(this.filtroBusqueda.toLowerCase())
    );
  }

  formatearDuracion(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}m`;
  }
}