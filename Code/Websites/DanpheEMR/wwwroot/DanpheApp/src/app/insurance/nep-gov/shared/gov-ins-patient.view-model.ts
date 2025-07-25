import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators
} from '@angular/forms';

import * as moment from 'moment/moment';


export class GovInsurancePatientVM {
  public PatientId: number = 0;
  public PatientCode: string = null;
  public FirstName: string = "";
  public MiddleName: string = '';
  public LastName: string = "";
  public PatientNameLocal: string = null;
  public DateOfBirth: string = null;
  public Gender: string = null;
  public ShortName: string = null;
  public PhoneNumber: string = null;
  public CountryId: number = 0;
  public CountrySubDivisionId: number = null;
  public CountrySubDivisionName: string = null;//used only in client side.
  public Age: string = null;
  public AgeUnit: string = 'Y'; //used only in client side
  public Address: string = null;

  //public MembershipTypeId: number = 0;

  //Insurance Informations
  public showInsuranceInfo: boolean = true;
  public InsuranceProviderId: number = null;
  public InsuranceName: string = null;
  public IMISCode: string = null;
  public InitialBalance: number = 0;
  public CurrentBalance: number = 0;


  //Audit Trail Information.
  public CreatedOn: string = null;
  public CreatedBy: number = null;
  public ModifiedOn: string = null;
  public ModifiedBy: number = null;
  public IsActive: boolean = true;

  public Ins_HasInsurance: boolean = true;
  public Ins_NshiNumber: string = '';
  public Ins_InsuranceBalance: number = 0;
  public Ins_InsuranceProviderId: number = null;

  public Ins_IsFamilyHead: boolean = null;
  public Ins_FamilyHeadNshi: string = '';
  public Ins_FamilyHeadName: string = '';
  public Ins_IsFirstServicePoint: boolean = null;
  public Ins_LatestClaimCode: string = null;

  public GovInsPatientValidator: FormGroup = null;

  public MunicipalityId: number = 0;
  public MunicipalityName: string = null;
  public EthnicGroup: string = "";
  public Email: string = '';
  public PolicyHolderUID: string = '';
  PolicyNo: number = null;
  IsPatientInformationLoaded = false;
  IsPatientEligibilityLoaded = false;
  eligibilityInfo: Eligibility = new Eligibility();
  Ins_FirstServicePoint: string = '';
  PatientImageURL: string = '';
  constructor() {
    var _formBuilder = new FormBuilder();
    this.GovInsPatientValidator = _formBuilder.group({
      'FirstName': ['', Validators.compose([Validators.required, Validators.maxLength(30)])],
      'LastName': ['', Validators.compose([Validators.required, Validators.maxLength(30)])],
      'MiddleName': ['', Validators.compose([Validators.maxLength(30)])],
      'Age': ['', Validators.compose([Validators.required])],
      'Gender': ['', Validators.required],
      'CountrySubDivisionId': ['', Validators.required],
      'PhoneNumber': ['', Validators.compose([Validators.required, Validators.pattern('^[0-9]{1,10}$')])],
      'CountryId': ['', Validators.required],
      'Ins_NshiNumber': ['', Validators.compose([Validators.required, Validators.pattern('^[0-9]{1,10}$')])],
      'InsuranceProviderId': ['', Validators.required,],
      'Ins_InsuranceBalance': ['', Validators.required,],
      'Ins_IsFirstServicePoint': ['', Validators.required],

      'Ins_IsFamilyHead': ['', Validators.required],
    });

  }

  public IsDirty(fieldname): boolean {
    if (fieldname == undefined) {
      return this.GovInsPatientValidator.dirty;
    }
    else {
      return this.GovInsPatientValidator.controls[fieldname].dirty;
    }

  }

  public IsValid(fieldname, validator): boolean {
    if (this.GovInsPatientValidator.valid) {
      return true;
    }

    if (fieldname == undefined) {
      return this.GovInsPatientValidator.valid;
    }
    else {
      return !(this.GovInsPatientValidator.hasError(validator, fieldname));
    }
  }

  public IsValidCheck(fieldname, validator): boolean {
    // this is used to check for patient form is valid or not 
    if (this.GovInsPatientValidator.valid) {
      return true;
    }

    if (fieldname == undefined) {
      return this.GovInsPatientValidator.valid;
    }
    else {

      return !(this.GovInsPatientValidator.hasError(validator, fieldname));
    }
  }

  dateValidators(control: FormControl): { [key: string]: boolean } {
    //get current date, month and time
    var currDate = moment().format('YYYY-MM-DD');
    //if positive then selected date is of future else it of the past
    if ((moment(control.value).diff(currDate) > 0) ||
      (moment(control.value).diff(currDate, 'years') < -200)) // this will not allow the age diff more than 200 is past
      return { 'wrongDate': true };
  }

  //to dynamically enable/disable any form-control. 
  //here [disabled] attribute was not working from cshtml, so written a separate logic to do it.
  public EnableControl(formControlName: string, enabled: boolean) {

    let currCtrol = this.GovInsPatientValidator.controls[formControlName];
    if (currCtrol) {
      if (enabled) {
        currCtrol.enable();
      }
      else {
        currCtrol.disable();
      }
    }
  }

  public UpdateValidator(onOff: string, formControlName: string) {
    if (formControlName == "PhoneNumber" && onOff == "off") {
      this.GovInsPatientValidator.controls['PhoneNumber'].validator = Validators.compose([]);
    }
    this.GovInsPatientValidator.controls[formControlName].updateValueAndValidity();
  }
}
export class Eligibility {

  AllowedMoney: number = 0;
  RegistrationCase: string = '';
  IsCoPayment: boolean = false;
  CoPayCashPercent: number = null;
}
