import { Component, Input, Output, EventEmitter, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface PeliculaForm {
  titulo: string;
  sinopsis: string;
  duracion: number | null;
  clasificacion: string;
  genero: string[];
  imagenUrl: string;
}

@Component({
  selector: 'app-modal-pelicula',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal.html'
})
export class Modal {
  @Input() mostrar: boolean = false;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<any>();

  pelicula: PeliculaForm = {
    titulo: '',
    sinopsis: '',
    duracion: null,
    clasificacion: '',
    genero: [],
    imagenUrl: ''
  };

  clasificaciones: string[] = ['G', 'PG', 'PG-13', 'R', 'NC-17'];
  todosGeneros: string[] = ['Acción', 'Aventura', 'Comedia', 'Drama', 'Ciencia Ficción', 'Terror', 'Romance', 'Animación', 'Fantasia', 'Musical'];
  
  archivoSeleccionado: File | null = null;
  vistaPreviaImagen: string | ArrayBuffer | null = null;

  onCerrar() {
    this.limpiarFormulario();
    this.cerrar.emit();
  }

  onGuardar() {
    if (this.validarFormulario()) {
      this.guardar.emit({
        ...this.pelicula,
        estado: true
      });
      this.limpiarFormulario();
    }
  }

  validarFormulario(): boolean {
    return !!(this.pelicula.titulo && 
              this.pelicula.sinopsis && 
              this.pelicula.duracion && 
              this.pelicula.clasificacion && 
              this.pelicula.genero.length > 0);
  }

  limpiarFormulario() {
    this.pelicula = {
      titulo: '',
      sinopsis: '',
      duracion: null,
      clasificacion: '',
      genero: [],
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

  toggleGenero(genero: string) {
    const index = this.pelicula.genero.indexOf(genero);
    if (index > -1) {
      this.pelicula.genero.splice(index, 1);
    } else {
      this.pelicula.genero.push(genero);
    }
  }

  isGeneroSeleccionado(genero: string): boolean {
    return this.pelicula.genero.includes(genero);
  }
}