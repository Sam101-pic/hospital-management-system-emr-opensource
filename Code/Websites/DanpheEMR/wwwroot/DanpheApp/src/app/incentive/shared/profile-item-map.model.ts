import { FormBuilder, FormGroup, Validators } from '@angular/forms';

export class ProfileItemMapModel {

  BillItemProfileMapId: number = 0;
  BillItemPriceId: number = null;
  ProfileId: number = null;
  // AssignedToPercent: number = null;
  // ReferredByPercent: number = null;
  PerformerPercent: number = null;
  PrescriberPercent: number = null;
  ReferrerPercent: number = null;
  PriceCategoryId: number = null;
  BillingTypesApplicable: string = null;
  public CreatedBy: number = null;
  public CreatedOn: string = null;
  public ServiceItemId: number = null;

  // displayed Properties
  public ItemName: string = '';
  public DepartmentName: string = '';
  public IsSelected: boolean = false;
  public DocObj = {};
  public OpdSelected: boolean = true;
  public IpdSelected: boolean = true;
  PriceCategoryName: string;

  IsPercentageValid: boolean = true;//pratik:30Jan'20 -- for individual validation of AssignedTo and Referral Percent. Only to be used in Client side.

  ProfileItemMapValidator: FormGroup = null;
  IsActive: boolean = true;

  constructor() {
    const _fb = new FormBuilder();
    this.ProfileItemMapValidator = _fb.group({
      'BillItemPriceId': ['', Validators.required],
      'ProfileId': ['', Validators.required],
      'PerformerPercent': ['', Validators.required],
      'PrescriberPercent': ['', Validators.required],
      'PriceCategoryId': ['', Validators.required]
    });
  }

  public IsDirty(fieldName): boolean {
    if (fieldName == undefined) {
      return this.ProfileItemMapValidator.dirty;
    }
    else {
      return this.ProfileItemMapValidator.controls[fieldName].dirty;
    }
  }
  public IsValid(): boolean { if (this.ProfileItemMapValidator.valid) { return true; } else { return false; } }
  public IsValidCheck(fieldName, validator): boolean {
    if (fieldName == undefined) {
      return this.ProfileItemMapValidator.valid;
    }
    else {
      return !(this.ProfileItemMapValidator.hasError(validator, fieldName));
    }
  }

}
