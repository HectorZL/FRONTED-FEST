import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Pelicula {
  id: number;
  titulo: string;
  sinopsis: string;
  duracion: number;
  clasificacion: string;
  genero: string;
  imagenUrl: string;
  estado: boolean;
}

@Component({
  selector: 'app-peliculas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './peliculas.html',
  styleUrls: ['./peliculas.scss']
})
export class Peliculas {
  pelicula: Partial<Pelicula> = {
    titulo: '',
    sinopsis: '',
    duracion: 0,
    clasificacion: '',
    genero: '',
    imagenUrl: ''
  };

  peliculas: Pelicula[] = [
    {
      id: 1,
      titulo: 'El Origen',
      sinopsis: 'Un ladrón que roba secretos corporativos mediante el uso de tecnología de sueños compartidos.',
      duracion: 148,
      clasificacion: 'PG-13',
      genero: 'Ciencia Ficción',
      imagenUrl: 'assets/origen.jpg',
      estado: true
    },
    {
      id: 2,
      titulo: 'El Padrino',
      sinopsis: 'La historia de una familia de la mafia italiana y su lucha por mantener el poder en el crimen organizado.',
      duracion: 175,
      clasificacion: 'R',
      genero: 'Drama',
      imagenUrl: 'assets/padrino.jpg',
      estado: true
    }
  ];

  clasificaciones: string[] = ['G', 'PG', 'PG-13', 'R', 'NC-17'];
  generos: string[] = ['Acción', 'Aventura', 'Comedia', 'Drama', 'Ciencia Ficción', 'Terror', 'Romance', 'Animación'];
  
  filtroBusqueda: string = '';
  archivoSeleccionado: File | null = null;
  vistaPreviaImagen: string | ArrayBuffer | null = null;

  agregarPelicula() {
    if (this.validarFormulario()) {
      const nuevaPelicula: Pelicula = {
        id: this.peliculas.length + 1,
        titulo: this.pelicula.titulo!,
        sinopsis: this.pelicula.sinopsis!,
        duracion: this.pelicula.duracion!,
        clasificacion: this.pelicula.clasificacion!,
        genero: this.pelicula.genero!,
        imagenUrl: this.vistaPreviaImagen as string || 'assets/default-movie.jpg',
        estado: true
      };

      this.peliculas.push(nuevaPelicula);
      this.limpiarFormulario();
    }
  }

  validarFormulario(): boolean {
    return !!(this.pelicula.titulo && 
              this.pelicula.sinopsis && 
              this.pelicula.duracion && 
              this.pelicula.clasificacion && 
              this.pelicula.genero);
  }

  limpiarFormulario() {
    this.pelicula = {
      titulo: '',
      sinopsis: '',
      duracion: 0,
      clasificacion: '',
      genero: '',
      imagenUrl: ''
    };
    this.archivoSeleccionado = null;
    this.vistaPreviaImagen = null;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivoSeleccionado = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.vistaPreviaImagen = reader.result;
      };
      reader.readAsDataURL(file);
    }
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
      pelicula.genero.toLowerCase().includes(this.filtroBusqueda.toLowerCase()) ||
      pelicula.clasificacion.toLowerCase().includes(this.filtroBusqueda.toLowerCase())
    );
  }

  formatearDuracion(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}m`;
  }
}