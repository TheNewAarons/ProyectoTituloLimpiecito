import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TareasPevComponent } from './tareas-pev.component';

describe('TareasPevComponent', () => {
  let component: TareasPevComponent;
  let fixture: ComponentFixture<TareasPevComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TareasPevComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TareasPevComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
