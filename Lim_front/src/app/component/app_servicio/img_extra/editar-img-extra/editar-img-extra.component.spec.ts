import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarImgExtraComponent } from './editar-img-extra.component';

describe('EditarImgExtraComponent', () => {
  let component: EditarImgExtraComponent;
  let fixture: ComponentFixture<EditarImgExtraComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditarImgExtraComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditarImgExtraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
