import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CarpetaPadreComponent } from './carpeta-padre.component';

describe('CarpetaPadreComponent', () => {
  let component: CarpetaPadreComponent;
  let fixture: ComponentFixture<CarpetaPadreComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CarpetaPadreComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CarpetaPadreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
