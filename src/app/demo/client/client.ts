import { Component } from '@angular/core';
import { ClientHeader } from './components/client-header/client-header';

@Component({
  selector: 'app-client',
  imports: [ClientHeader],
  templateUrl: './client.html',
  styleUrl: './client.scss',
})
export class Client {

}
