import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearImgExtraComponent } from './crear-img-extra.component';

describe('CrearImgExtraComponent', () => {
  let component: CrearImgExtraComponent;
  let fixture: ComponentFixture<CrearImgExtraComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CrearImgExtraComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CrearImgExtraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
