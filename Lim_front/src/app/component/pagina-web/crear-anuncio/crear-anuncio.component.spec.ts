import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearAnuncioComponent } from './crear-anuncio.component';

describe('CrearAnuncioComponent', () => {
  let component: CrearAnuncioComponent;
  let fixture: ComponentFixture<CrearAnuncioComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CrearAnuncioComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CrearAnuncioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
