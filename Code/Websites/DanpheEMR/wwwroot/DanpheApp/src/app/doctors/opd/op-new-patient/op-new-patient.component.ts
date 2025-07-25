import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import * as moment from 'moment/moment';

import { VisitService } from '../../../appointments/shared/visit.service';
import { PatientService } from "../../../patients/shared/patient.service";
import { CallbackService } from '../../../shared/callback.service';
import { MessageboxService } from '../../../shared/messagebox/messagebox.service';
import { RouteFromService } from '../../../shared/routefrom.service';
import { DoctorsBLService } from '../../shared/doctors.bl.service';

import { ADT_DLService } from '../../../adt/shared/adt.dl.service';
import { Visit } from "../../../appointments/shared/visit.model";
import { ClinicalPatientService } from '../../../clinical-new/shared/clinical-patient.service';
import { Patient } from '../../../patients/shared/patient.model';
import { SecurityService } from '../../../security/shared/security.service';
import { DanpheCache, MasterType } from '../../../shared/danphe-cache-service-utility/cache-services';
import GridColumnSettings from '../../../shared/danphe-grid/grid-column-settings.constant';
import { GridEmitModel } from "../../../shared/danphe-grid/grid-emit.model";
@Component({
  selector: 'app-op-new-patient',
  templateUrl: './op-new-patient.component.html',
  styleUrls: ['./op-new-patient.component.css']
})

export class OPNewPatientComponent implements OnDestroy {
  public _patientservice: PatientService = null;
  currentVisit: Visit = new Visit();
  public visitList: Array<Visit> = new Array<Visit>();
  public filteredVisitList: Array<Visit> = new Array<Visit>();
  public tempFilteredVisitList: Array<Visit> = new Array<Visit>();
  public DeptVisitList: Array<Visit> = new Array<Visit>();
  public filtertodaysVisitList: Array<any> = new Array<any>();
  public _visitService: VisitService = null;
  public _callbackService: CallbackService = null;
  public enablePreview: boolean = false;
  public currentPatient: Patient = null;
  //used to pass value to rangeType in custom-date
  public dateRange: string = null;
  public fromDate: string = null;
  public toDate: string = null;
  public todaysVisitList: Array<any> = new Array<any>();
  public today: string = null;
  public DateValidator: FormGroup = null;
  public DoctorOPNewPatientGridColumns: Array<any> = null;
  public OPFollowUpPatientGridColumns: Array<any> = null;
  public OPFavoritePatientGridColumns: Array<any> = null;
  // public docDeptAppointmentGridColumns: Array<any> = null;
  public index: number;
  public ShowMessage: boolean = false;
  public selectedVisit: Visit = new Visit();
  public deptPerformerList: any;
  public VisitTypeList: any[];
  selectedVisitType: any;
  public employeeId: number = 0;
  public validDate: boolean = false;
  public showAssignToOther = false;
  public addTreatmentType = false;
  public currSelectedPatient: any;
  public newAssignee: any;
  public patientVisitType: string = "all";
  private appointmentList: any;
  public Timer: any = null;
  public showDoctorWisePatients: boolean = false;
  public SelectedDepartmentId: number = 0;
  public DepartmentList: Array<Visit> = new Array<Visit>();
  public FilteredOPDPatientGridData: Array<any> = new Array<any>();
  public OPDPatientGridData: Array<any> = new Array<any>();
  public FavoritePatients: Array<any> = new Array<any>();
  public FollowUpPatients: Array<any> = new Array<any>();
  public FavoritePatientIds: Array<any> = new Array<any>();
  public FollowUpPatientIds: Array<any> = new Array<any>();
  constructor(
    _patientService: PatientService,
    _visitServ: VisitService,
    _callbackService: CallbackService,
    public router: Router,
    public msgBoxServ: MessageboxService,
    //public coreService: CoreService,
    public doctorsBLService: DoctorsBLService,
    public routeFromService: RouteFromService,
    public changeDetector: ChangeDetectorRef,
    public securityService: SecurityService,
    public admissionBLService: ADT_DLService,
    private _selectedPatientService: ClinicalPatientService,) {
    this._patientservice = _patientService;
    this._visitService = _visitServ;
    this._callbackService = _callbackService;
    var _formBuilder = new FormBuilder();
    // this.DoctorOPNewPatientGridColumns = GridColumnSettings.DoctorOPNewPatientList;
    this.DoctorOPNewPatientGridColumns = GridColumnSettings.DoctorAppointmentList;
    this.OPFollowUpPatientGridColumns = GridColumnSettings.OPFollowUpPatientList;
    this.OPFavoritePatientGridColumns = GridColumnSettings.OPFavoritePatientList;
    this.DateValidator = _formBuilder.group({
      'fromDate': [this.fromDate, Validators.compose([Validators.required, this.dateValidators])],
      'toDate': [this.toDate, Validators.compose([Validators.required, this.dateValidators])],
    });
    this.dateRange = "today";
    this.today = moment().format('YYYY-MM-DD');
    this.GetICDList();
    this.GetDepartMent();
    this.GetDepartmentList();
    this.LoadTodaysVisitList();
    this.Timer = setInterval(() => {
      this.LoadTodaysVisitList();
    }, 60000000);
  }
  ngOnDestroy() {
    clearInterval(this.Timer);
  }

  GetICDList() {
    var icd = DanpheCache.GetData(MasterType.ICD, null);
  }
  ShowPatientDoctorWise() {
    this.showDoctorWisePatients = !this.showDoctorWisePatients;
    if (this.showDoctorWisePatients == true) {
      this.tempFilteredVisitList = this.filteredVisitList;
      this.filteredVisitList = this.filteredVisitList.filter(x => x.PerformerId == this.employeeId);
    }
    else {
      this.filteredVisitList = this.tempFilteredVisitList;
    }
    this.GetFavoritesList();
    this.GetFollowUpList();
  }
  GetDepartMent() {
    this.employeeId = this.securityService.GetLoggedInUser().EmployeeId;
    this.doctorsBLService.GetDepartMent(this.employeeId).subscribe(res => {
      if (res.Status == "OK") {
        var data = res.Results;
        this.SelectedDepartmentId = data.DepartmentId;
        this.deptPerformerList = data.Providers;
      }
      else {
        this.msgBoxServ.showMessage("failed", ["Invalid Employee"]);
      }
    });
  }
  LoadTodaysVisitList() {
    if (this.today >= moment().format('YYYY-MM-DD')) {
      this.doctorsBLService.GetTodaysVisitsList(this.today)
        .subscribe(res => {
          if (res.Status == "OK") {
            this.todaysVisitList = [];
            //  this.changeDetector.detectChanges();
            this.appointmentList = res.Results;
            if (this.showDoctorWisePatients == true) {
              this.filteredVisitList = this.filteredVisitList.filter(x => x.PerformerId == this.employeeId);
            }
            this.GetFavoritesList();
            this.GetFollowUpList();
            this.OnVisitTypeChange();

          }
          else {
            this.msgBoxServ.showMessage("failed", [res.ErrorMessage]);
          }
        });
    }
    else {
      this.msgBoxServ.showMessage("", ["Select Present or future date."]);
    }
  }

  LoadPreviousVisitList() {
    if (this.fromDate <= this.toDate) {
      if (this.fromDate >= moment().format('YYYY-MM-DD') || this.toDate >= moment().format('YYYY-MM-DD')) {
        this.validDate = true;
        this.doctorsBLService.GetPastVisits(this.fromDate, this.toDate)
          .subscribe(res => {
            if (res.Status == "OK") {
              this.visitList = [];
              this.visitList = res.Results;
              this.visitList = this.visitList.filter(x => x.VisitType == "outpatient" || x.VisitType == "OUTPATIENT" && x.ConcludeDate != null);
              this.filteredVisitList = this.GetFormattedVisits(this.visitList);
              if (this.showDoctorWisePatients == true) {
                this.filteredVisitList = this.filteredVisitList.filter(x => x.PerformerId == this.employeeId);
              }
              this.GetFavoritesList();
              this.GetFollowUpList();

            }
            else {
              this.msgBoxServ.showMessage("failed", [res.ErrorMessage]);
            }
          });
      }
      else {
        this.msgBoxServ.showMessage("", ["Future Dates are not allowed."]);
      }
    }
    else {
      this.validDate = false;
      this.visitList = [];
      this.msgBoxServ.showMessage("", ["Select proper dates."]);
    }
  }
  GetFormattedVisits(visitList: Array<Visit>): Array<Visit> {
    let formattedVisits = visitList.map(function (vis) {
      vis.VisitDate = moment(vis.VisitDate).format('YYYY-MM-DD');
      vis.VisitTime = moment(vis.VisitTime, "hhmm").format('hh:mm A');
      vis.VisitType = vis.VisitType.toUpperCase();
      vis.Patient.Gender = vis.Patient.Gender.charAt(0).toUpperCase();
      return vis;
    });
    return formattedVisits;
  }

  RouteToOrders(selectedVisit: Visit, routeTo: string) {
    this.SelectVisit(selectedVisit);
    this.routeFromService.RouteFrom = routeTo;
    this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
  }
  RouteToPatientOverview(selectedVisit: Visit) {
    this.SelectVisit(selectedVisit);
    this.router.navigate(['/Doctors/PatientOverviewMain/PatientOverview']);
  }
  RouteToNewPatientOverview(selectedVisit: Visit) {
    let currPatient = this._selectedPatientService.GetGlobal();
    currPatient.PatientId = selectedVisit.Patient.PatientId;
    currPatient.PatientCode = selectedVisit.Patient.PatientCode;
    currPatient.Address = selectedVisit.Patient.Address;
    currPatient.PhoneNumber = selectedVisit.Patient.PhoneNumber;
    currPatient.PatientVisitId = selectedVisit.PatientVisitId;
    currPatient.FirstName = selectedVisit.Patient.FirstName;
    currPatient.LastName = selectedVisit.Patient.LastName;
    currPatient.Gender = selectedVisit.Patient.Gender;
    currPatient.DateOfBirth = selectedVisit.Patient.DateOfBirth;
    currPatient.Age = selectedVisit.Patient.Age;
    currPatient.Name = selectedVisit.Patient.ShortName;
    currPatient.VisitType = selectedVisit.VisitType.toLowerCase();
    this._selectedPatientService.SelectedPatient = currPatient;
    this.router.navigate(['/Doctors/Clinical-Overview']);
  }

  //check the assignment logic below properly...
  SelectVisit(selectedVisit: Visit) {
    let currPatient = this._patientservice.getGlobal();
    let visitGlobal = this._visitService.getGlobal();
    currPatient.PatientId = selectedVisit.PatientId; //patient needed in problems part
    currPatient.PatientCode = selectedVisit.Patient.PatientCode;
    currPatient.Address = selectedVisit.Patient.Address;
    currPatient.PhoneNumber = selectedVisit.Patient.PhoneNumber;
    visitGlobal.PatientId = selectedVisit.PatientId;
    visitGlobal.PatientVisitId = selectedVisit.PatientVisitId;
    currPatient.FirstName = selectedVisit.Patient.FirstName;
    currPatient.LastName = selectedVisit.Patient.LastName;
    currPatient.Gender = selectedVisit.Patient.Gender;
    currPatient.DateOfBirth = selectedVisit.Patient.DateOfBirth;
    currPatient.Age = selectedVisit.Patient.Age;
    currPatient.ShortName = selectedVisit.Patient.ShortName;
    visitGlobal.PerformerId = selectedVisit.PerformerId;
    visitGlobal.PerformerName = selectedVisit.PerformerName;
    visitGlobal.VisitDate = selectedVisit.VisitDate;
    visitGlobal.VisitType = selectedVisit.VisitType;
    visitGlobal.ConcludeDate = selectedVisit.ConcludeDate;
    this.currentVisit = visitGlobal;
  }

  //to check whether the the textbox is dirty or not ....
  public IsDirty(fieldname): boolean {
    if (fieldname == undefined) {
      return this.DateValidator.dirty;
    }
    else {
      return this.DateValidator.controls[fieldname].dirty;
    }
  }
  //to check it whether the value of the textbox is valid or not ...
  public IsValidCheck(fieldname, validator): boolean {
    // this is used to check for patient form is valid or not
    if (!this.DateValidator.dirty) {
      return true;
    }
    if (fieldname == undefined) {
      return this.DateValidator.valid;
    }
    else {
      return !(this.DateValidator.hasError(validator, fieldname));
    }
  }

  // LoadTreatmentTypeByStatus(value: number) {
  //   this.filtertodaysVisitList = new Array<any>();
  //   if (value == 1) {
  //     if (this.todaysVisitList.length) {
  //       this.filtertodaysVisitList = JSON.parse(JSON.stringify(this.todaysVisitList));//deepcopy
  //       this.filtertodaysVisitList.forEach(a => { a.visit = a.visit.filter(a => a.Comments == "Surgery") });
  //       this.filtertodaysVisitList = this.filtertodaysVisitList.filter(a => a.visit.length != 0);
  //     }
  //   }
  //   if (value == 2) {
  //     this.filtertodaysVisitList = JSON.parse(JSON.stringify(this.todaysVisitList));//deepcopy
  //     this.filtertodaysVisitList.forEach(a => { a.visit = a.visit.filter(a => a.Comments == "Normal Checkup") });
  //     this.filtertodaysVisitList = this.filtertodaysVisitList.filter(a => a.visit.length != 0);
  //   }
  //   if (value == 0) {
  //     this.filtertodaysVisitList = this.todaysVisitList;
  //   }
  // }

  dateValidators(control: FormControl): { [key: string]: boolean } {
    //get current date, month and time
    var currDate = moment().format('YYYY-MM-DD 23:59');

    //if positive then selected date is of future else it of the past
    if ((moment(control.value).diff(currDate) > 0) ||
      (moment(control.value).diff(currDate, 'years') < -10)) // this will not allow the age diff more than 10 is past
      return { 'wrongDate': true };
  }

  //event onDateChange
  onDateChange($event) {
    this.fromDate = $event.fromDate;
    this.toDate = $event.toDate;
    this.DateValidator.controls["fromDate"].setValue(this.fromDate);
    this.DateValidator.controls["toDate"].setValue(this.toDate);
    this.DateValidator.updateValueAndValidity();
    this.validDate = false;
    this.LoadPreviousVisitList();
  }

  onDateChangeDept($event) {
    this.fromDate = $event.fromDate;
    this.toDate = $event.toDate;
    this.DateValidator.controls["fromDate"].setValue(this.fromDate);
    this.DateValidator.controls["toDate"].setValue(this.toDate);
    this.DateValidator.updateValueAndValidity();
    this.loadDocDeptVisitList();
  }

  DocAppointmentGridActions($event: GridEmitModel) {
    switch ($event.Action) {
      case "preview":
        {
          this.RouteToNewPatientOverview($event.Data);
        }
        break;
      case "labs":
        {


        }
        break;
      case "imaging":
        {



        }
        break;
      case "addfavorite":
        {
          //chek if we can pass only data and not itemid.
          let patientId = $event.Data.PatientId;
          let itemId = JSON.stringify($event.Data.PatientId);
          let preferenceType = "Patient";

          this.filteredVisitList.map((a) => {
            if (a.PatientId === patientId) {
              a.IsFavorite = true;
            }
          });
          this.FavoritePatients = this.FavoritePatients.concat(
            this.filteredVisitList.filter(
              (a) => a.PatientId == patientId
            )
          );
          this.changeDetector.detectChanges();

          this.admissionBLService
            .AddToFavorites(itemId, preferenceType, patientId)
            .subscribe((res) => {
              if (res.Status == "OK") {
                this.FavoritePatientIds.push(res.Results);
                this.FavoritePatients = this.FavoritePatients.concat(
                  this.filteredVisitList.filter(
                    (a) => a.PatientId == res.Results
                  )
                );
                this.filteredVisitList.map((a) => {
                  if (a.PatientId == res.Results) {
                    a.IsFavorite = true;
                  }
                });
                this.filteredVisitList.map((a) => {
                  if (a.PatientId == res.Results) {
                    a.IsFavorite = true;
                  }
                });
                this.filteredVisitList = this.filteredVisitList.slice();
                this.changeDetector.detectChanges();
              } else {
                console.log(
                  "couldn't add to favourite. Error_Message: " +
                  res.ErrorMessage
                );
              }
            });
        }
        break;
      case "removefavorite": {
        let patientId = $event.Data.PatientId;
        let itemId = JSON.stringify($event.Data.PatientId);
        let preferenceType = "Patient";

        this.filteredVisitList.map((a) => {
          if (a.PatientId === patientId) {
            a.IsFavorite = false;
          }
        });
        this.FavoritePatients = this.FavoritePatients.filter(
          (a) => a.PatientId != patientId
        );
        this.changeDetector.detectChanges();

        this.admissionBLService
          .RemoveFromFavorites(itemId, preferenceType)
          .subscribe((res) => {
            if (res.Status == "OK") {
              this.FavoritePatientIds = this.FavoritePatientIds.filter(
                (a) => a != patientId
              );
              this.FavoritePatients = this.FavoritePatients.filter(
                (a) => a.PatientId != patientId
              );
              this.filteredVisitList.map((a) => {
                if (a.PatientId == patientId) {
                  a.IsFavorite = false;
                }
              });
              this.filteredVisitList.map((a) => {
                if (a.PatientId == patientId) {
                  a.IsFavorite = false;
                }
              });
              this.filteredVisitList = this.filteredVisitList.slice();
              this.filteredVisitList = this.filteredVisitList.slice();
              this.changeDetector.detectChanges();
            } else {
              console.log(
                "couldn't remove from favourite. Error_Message: " +
                res.ErrorMessage
              );
            }
          });
      }
        break;
      case "addfollowup":
        {
          //chek if we can pass only data and not itemid.
          let patientId = $event.Data.PatientId;
          let itemId = JSON.stringify($event.Data.PatientId);
          let preferenceType = "FollowUp";
          // Immediate update to UI before waiting for backend response
          this.OPDPatientGridData.map((a) => {
            if (a.PatientId === patientId) {
              a.IsFollowUp = true;
            }
          });
          this.FilteredOPDPatientGridData.map((a) => {
            if (a.PatientId === patientId) {
              a.IsFollowUp = true;
            }
          });
          this.FollowUpPatients = this.FollowUpPatients.concat(
            this.OPDPatientGridData.filter((a) => a.PatientId == patientId)
          );

          // Trigger immediate change detection
          this.changeDetector.detectChanges();
          this.admissionBLService
            .AddToFavorites(itemId, preferenceType, patientId)
            .subscribe((res) => {
              if (res.Status == "OK") {
                this.FollowUpPatientIds.push(res.Results);
                this.FollowUpPatients = this.FollowUpPatients.concat(
                  this.OPDPatientGridData.filter(
                    (a) => a.PatientId == res.Results
                  )
                );
                this.OPDPatientGridData.map((a) => {
                  if (a.PatientId == res.Results) {
                    a.IsFollowUp = true;
                  }
                });
                this.FilteredOPDPatientGridData.map((a) => {
                  if (a.PatientId == res.Results) {
                    a.IsFollowUp = true;
                  }
                });
                this.FilteredOPDPatientGridData = this.FilteredOPDPatientGridData.slice();
                this.changeDetector.detectChanges();
              } else {
                console.log(
                  "couldn't add to follow up list. Error_Message: " +
                  res.ErrorMessage
                );
              }
            });
        }
        break;
      case "removefollowup": {
        let patientId = $event.Data.PatientId;
        let itemId = JSON.stringify($event.Data.PatientId);
        let preferenceType = "FollowUp";
        this.filteredVisitList.map((a) => {
          if (a.PatientId === patientId) {
            a.IsFavorite = false;
          }
        });
        this.FavoritePatients = this.FavoritePatients.filter(
          (a) => a.PatientId != patientId
        );

        // Trigger immediate change detection
        this.changeDetector.detectChanges();
        this.admissionBLService
          .RemoveFromFavorites(itemId, preferenceType)
          .subscribe((res) => {
            if (res.Status == "OK") {
              this.FollowUpPatientIds = this.FollowUpPatientIds.filter(
                (a) => a != patientId
              );
              this.FollowUpPatients = this.FollowUpPatients.filter(
                (a) => a.PatientId != patientId
              );
              this.OPDPatientGridData.map((a) => {
                if (a.PatientId == patientId) {
                  a.IsFollowUp = false;
                }
              });
              this.FilteredOPDPatientGridData.map((a) => {
                if (a.PatientId == patientId) {
                  a.IsFollowUp = false;
                }
              });
              this.OPDPatientGridData = this.OPDPatientGridData.slice();
              this.FilteredOPDPatientGridData = this.FilteredOPDPatientGridData.slice();
              this.changeDetector.detectChanges();
            } else {
              console.log(
                "couldn't remove from follow up list. Error_Message: " +
                res.ErrorMessage
              );
            }
          });
      }
      default:
        break;
    }
  }

  loadDocDeptVisitList() {
    for (var i in this.DateValidator.controls) {
      this.DateValidator.controls[i].markAsDirty();
      this.DateValidator.controls[i].updateValueAndValidity();
    }
    if (this.IsValidCheck(undefined, undefined)) {
      this.doctorsBLService.GetDocDeptVisits(this.fromDate, this.toDate)
        .subscribe(res => {
          if (res.Status == "OK") {
            this.DeptVisitList = [];
            //  this.changeDetector.detectChanges();
            this.DeptVisitList = this.GetFormattedVisits(res.Results);
          }
          else {
            this.msgBoxServ.showMessage("failed", [res.ErrorMessage]);
          }
        });
    }
  }

  ClosePopUp() {
    this.currentVisit = new Visit();
    this.showAssignToOther = false;
  }

  OnVisitTypeChange() {
    if (this.patientVisitType == "all") {
      this.todaysVisitList = this.appointmentList;

      this.filtertodaysVisitList = new Array<any>();
      this.filtertodaysVisitList = JSON.parse(JSON.stringify(this.todaysVisitList));
      return;
    }
    this.todaysVisitList = new Array<any>();
    let vl = new Array<Visit>();
    this.appointmentList.forEach(a => {
      a.visit.forEach(b => {
        if (b.VisitType == this.patientVisitType) {
          vl.push(b);
        }
      });
      this.todaysVisitList.push({ ProviderName: a.ProviderName, visit: vl })
    });

  }
  onChangeToday() {
    this.LoadTodaysVisitList();
  }

  //Close() {
  //  this.ShowMessage = false;
  //}

  ShowAssignToOther(visitdata) {
    var data = {
      PatientName: visitdata.Patient.ShortName,
      AgeSex: visitdata.Patient.Age + "/" + visitdata.Patient.Gender,
      PerformerId: visitdata.PerformerId,
      PerformerName: visitdata.PerformerName,
      VisitId: visitdata.PatientVisitId,
      Remark: ""
    };
    this.newAssignee = visitdata.PerformerId;
    this.currSelectedPatient = data;
    this.showAssignToOther = true;
  }

  ngOnInit() {
    //this.ShowMessage = true;
  }

  AssignToOther() {
    var newPerformerId = parseInt(this.newAssignee);
    if (this.currSelectedPatient.PerformerId == newPerformerId) {
      this.msgBoxServ.showMessage("Error", ["Choose different provider!"])
      return;
    }
    if (this.currSelectedPatient.Remark == "") {
      this.msgBoxServ.showMessage("Error", ["Remark is mandetory!"])
      return;
    }
    var datatosend = {
      PatientVisitId: this.currSelectedPatient.VisitId,
      PerformerId: newPerformerId,
      Remarks: this.currSelectedPatient.Remark,
      ModifiedBy: this.employeeId
    }
    this.doctorsBLService.ChangeProvider(datatosend)
      .subscribe(res => {
        if (res.Status == "OK") {
          var data = res.Results;
          this.msgBoxServ.showMessage("Success", ["Assigned to " + data]);
          this.LoadTodaysVisitList();
        } else {
          this.msgBoxServ.showMessage("Error", ["Data not updated please try again!"]);
        }
      });
    this.showAssignToOther = false;
  }

  FilterList(deptId: number) {
    if (deptId == 0) {
      this.FilteredOPDPatientGridData = this.OPDPatientGridData;
    } else {
      this.FilteredOPDPatientGridData = this.OPDPatientGridData.filter(
        (a) => a.DepartmentId == deptId
      );
    }
  }

  GetDepartmentList() {
    this.admissionBLService.GetDepartments().subscribe(
      (res) => {
        if (res.Status == "OK") {
          this.DepartmentList = res.Results;
        } else {
          this.msgBoxServ.showMessage("Error", [res.ErrorMessage]);
        }
      },
      (err) => {
        this.msgBoxServ.showMessage("Error", [err.ErrorMessage]);
      }
    );
  }

  GetFavoritesList() {
    this.admissionBLService.GetEmployeeFavorites().subscribe(
      (res) => {
        if (res.Status == "OK") {
          if (res.Results != null) {
            this.FavoritePatientIds = new Array<any>();
            this.FavoritePatients = new Array<any>();
            this.FavoritePatientIds = res.Results;
            for (var i = 0; i < this.FavoritePatientIds.length; i++) {
              this.FavoritePatients = this.FavoritePatients.concat(
                this.filteredVisitList.filter(
                  (a) => a.PatientId == this.FavoritePatientIds[i]
                )
              );
              this.filteredVisitList.map((a) => {
                if (a.PatientId == this.FavoritePatientIds[i]) {
                  a.IsFavorite = true;
                }
              });
            }
          }
          this.filteredVisitList = this.filteredVisitList.slice();
          this.changeDetector.detectChanges();
          this.filteredVisitList = this.filteredVisitList;
          // if (this.securityService.loggedInUser.Employee.DepartmentId != null) {
          //   this.SelectedDepartmentId = this.securityService.loggedInUser.Employee.DepartmentId;
          //   this.FilterList(this.SelectedDepartmentId);
          // }
        } else {
          this.msgBoxServ.showMessage("error", [res.ErrorMessage]);
        }
      },
      (err) => {
        this.msgBoxServ.showMessage("error", [err.ErrorMessage]);
      }
    );
  }

  GetFollowUpList() {
    this.admissionBLService.GetEmployeeFollowUp().subscribe(
      (res) => {
        if (res.Status == "OK") {
          if (res.Results != null) {
            this.FollowUpPatientIds = new Array<any>();
            this.FollowUpPatients = new Array<any>();
            this.FollowUpPatientIds = res.Results;
            for (var i = 0; i < this.FollowUpPatientIds.length; i++) {
              this.FollowUpPatients = this.FollowUpPatients.concat(
                this.filteredVisitList.filter(
                  (a) => a.PatientId == this.FollowUpPatientIds[i]
                )
              );
              this.filteredVisitList.map((a) => {
                if (a.PatientId == this.FollowUpPatientIds[i]) {
                  a.IsFollowUp = true;
                }
              });
            }
          }
          this.filteredVisitList = this.filteredVisitList.slice();
          this.changeDetector.detectChanges();
          this.filteredVisitList = this.filteredVisitList;
          // if (this.securityService.loggedInUser.Employee.DepartmentId != null) {
          //   this.SelectedDepartmentId = this.securityService.loggedInUser.Employee.DepartmentId;
          //   this.FilterList(this.SelectedDepartmentId);
          // }
        } else {
          this.msgBoxServ.showMessage("error", [res.ErrorMessage]);
        }
      },
      (err) => {
        this.msgBoxServ.showMessage("error", [err.ErrorMessage]);
      }
    );
  }
  //public messageDetail: any;

  //GetMessageOfTheDay() {
  //    var paramValue = this.coreService.Parameters.find(a => a.ParameterName == 'Information/Message').ParameterValue;
  //    if (paramValue)
  //        this.messageDetail = paramValue;
  //    else
  //        this.msgBoxServ.showMessage("error", ["Please enter parameter values for Information or Message"]);
  //}
}
