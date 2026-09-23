import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app.module';
import {enableProdMode} from '@angular/core';
import { environment } from 'src/environments/environment.prod';

enableProdMode();
platformBrowserDynamic().bootstrapModule(AppModule);

if (environment.production) {
    enableProdMode();
    if(window){
      window.console.log=function(){};
    }
  }
  
