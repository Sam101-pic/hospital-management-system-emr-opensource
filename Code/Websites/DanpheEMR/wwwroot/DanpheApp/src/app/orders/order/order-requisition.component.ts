import { Component } from '@angular/core';
import { Router } from '@angular/router';
import * as _ from 'lodash';
import * as moment from 'moment/moment';
import { VisitService } from '../../appointments/shared/visit.service';
import { MedicationBLService } from '../../clinical/shared/medication.bl.service';
import { LabTestRequisition } from '../../labs/shared/lab-requisition.model';
import { LabsBLService } from '../../labs/shared/labs.bl.service';
import { OrderService } from '../../orders/shared/order.service';
import { PatientService } from '../../patients/shared/patient.service';
import { ImagingItemRequisition } from '../../radiology/shared/imaging-item-requisition.model';
import { ImagingBLService } from '../../radiology/shared/imaging.bl.service';
import { SecurityService } from "../../security/shared/security.service";
import { MessageboxService } from '../../shared/messagebox/messagebox.service';

//http is used for temporary purpose only: remove it ASAP : sud-6feb2018
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CurrentVisitContextVM } from '../../appointments/shared/current-visit-context.model';
import { Visit } from '../../appointments/shared/visit.model';
import { BillItemRequisition } from '../../billing/shared/bill-item-requisition.model';
import { BillingCounter } from '../../billing/shared/billing-counter.model';
import { BillingTransactionItem } from '../../billing/shared/billing-transaction-item.model';
import { BillingTransaction } from '../../billing/shared/billing-transaction.model';
import { BillingBLService } from '../../billing/shared/billing.bl.service';
import { Patient } from '../../patients/shared/patient.model';
import { PHRMGenericModel } from '../../pharmacy/shared/phrm-generic.model';
import { PHRMItemMasterModel } from '../../pharmacy/shared/phrm-item-master.model';
import { PHRMPrescriptionItem } from '../../pharmacy/shared/phrm-prescription-item.model';
import { PHRMPrescription } from '../../pharmacy/shared/phrm-prescription.model';
import { DanpheHTTPResponse } from '../../shared/common-models';
import { DanpheCache, MasterType } from '../../shared/danphe-cache-service-utility/cache-services';
import { ENUM_BillingStatus, ENUM_BillingType, ENUM_DanpheHTTPResponses, ENUM_MessageBox_Status, ENUM_OrderStatus, ENUM_VisitType } from '../../shared/shared-enums';
import { OrderItemsVM, OrderResponse } from '../shared/orders-vms';
import { OrdersBLService } from '../shared/orders.bl.service';


@Component({
  templateUrl: "../../view/order-view/OrderRequisitions.html" // "/OrderView/OrderRequisitions"
})

export class OrderRequisitionsComponent {

  public labRequisitions: Array<LabTestRequisition> = [];
  public ImagingRequisitions: Array<ImagingItemRequisition> = [];
  public medications: Array<PHRMPrescriptionItem> = [];
  public otherRequisitions: Array<BillItemRequisition> = [];

  public labRequisitionsToPost: Array<LabTestRequisition> = [];
  public ImagingRequisitionsToPost: Array<ImagingItemRequisition> = [];
  public medicationsToPost: Array<PHRMPrescriptionItem> = [];
  public medication: PHRMPrescription = new PHRMPrescription();
  public options = {
    headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' })
  };
  public medRouteList: Array<any> = [];
  //this is temporary solution...to avoid to alert after posting and showing the status of  lab and imaging  requistion
  public OrderResponse: OrderResponse = new OrderResponse();
  public loading: boolean = true;

  public currPatient: Patient = new Patient();
  public currVisit: Visit = new Visit();
  public currUser: any = null;
  public currTime: string = null;
  public currPatVisitContext: CurrentVisitContextVM = null;
  public billingTransaction = new BillingTransaction();
  public billingTransactionItems = new Array<BillingTransactionItem>();
  public CounterList: BillingCounter[];
  public SelectedCounterId: number = null;

  constructor(public ordServ: OrderService, public patientService: PatientService,
    public visitService: VisitService, public router: Router,
    public labBLService: LabsBLService, public imgBLService: ImagingBLService,
    public medicationBLService: MedicationBLService, public orderBLService: OrdersBLService,
    public msgBoxServ: MessageboxService,
    public securityService: SecurityService,
    public http: HttpClient,

    public billingBLService: BillingBLService) {
    this.LoadCounters();

    this.currPatient = this.patientService.globalPatient;
    this.currVisit = this.visitService.globalVisit;
    this.currUser = this.securityService.GetLoggedInUser();
    this.currTime = moment().format('YYYY-MM-DD HH:mm:ss');

    this.GetCurrentPatientVisitContext();


    //this is for temporary purpse: revise it later on: sud-6Feb2018
    // this.medRouteList = ["Oral.", "IV.", "IM.", "SQ.", "ID.", "TOPICAL.", "Inhalation", "Per Rectal"];
    this.medRouteList = ["mouth", "intravenous", "intramuscular", "inhalation", "vaginally", "eyes", "intravitreal injection"];//this is as per HAMS.

  }


  GetCurrentPatientVisitContext() {
    this.labBLService.GetDataOfInPatient(this.currPatient.PatientId, this.currVisit.PatientVisitId)
      .subscribe(res => {
        if (res.Status == "OK") {
          this.currPatVisitContext = res.Results;
          this.LoadOrder();
          this.loading = false;
        } else {
          this.msgBoxServ.showMessage("failed", ["Problem! Cannot get the Current Visit Context ! "])
        }
      });
  }

  // this is load the order item in start
  // and in this the respected value are mapped into requisition of lab and imaging from services
  LoadOrder() {
    //var lab = this.ordServ.labTests;
    //var imgItem = this.ordServ.imagingItems;

    var labItems = this.ordServ.allNewOrderItems.filter(itm => itm.PreferenceType == "Lab");
    var imgItems = this.ordServ.allNewOrderItems.filter(itm => itm.PreferenceType == "Imaging");
    var medItems = this.ordServ.allNewOrderItems.filter(itm => itm.PreferenceType == "Medication");
    var otherItems = this.ordServ.allNewOrderItems.filter(itm => itm.PreferenceType == "Others");

    this.labRequisitions = this.GetLabItemsMapped(labItems);
    this.medications = this.GetMedicationItemsMapped(medItems);
    this.ImagingRequisitions = this.GetImagingItemsMapped(imgItems);
    this.otherRequisitions = this.GetOtherItemsMapped(otherItems);
  }

  //to remove one medicine from the list of medicines.
  RemoveMedicineItem(indx) {
    if (this.medications) {
      this.medications.splice(indx, 1);
    }
  }


  LoadCounters() {
    let allCounters: Array<BillingCounter>;
    allCounters = DanpheCache.GetData(MasterType.BillingCounter, null);
    if (allCounters && allCounters.length) {
      this.CounterList = allCounters.filter(cnt => cnt.CounterType == null || cnt.CounterType == "BILLING");
      this.SelectedCounterId = this.CounterList[0].CounterId;
    }
  }
  //posting data to requisition table
  AddToRequisition() {

    this.loading = true;
    //! below assignments are not needed if they are not used further, in Below if condition we can avoid using these.
    this.labRequisitionsToPost = this.labRequisitions;
    this.medicationsToPost = this.medications;
    this.ImagingRequisitionsToPost = this.ImagingRequisitions;

    //only for temporary purpose, call it using pharmacydl service--sud:6feb

    if (this.loading) {
      //! Post Provisional Bill.
      if ((this.labRequisitionsToPost && this.labRequisitionsToPost.length > 0) || (this.ImagingRequisitionsToPost && this.ImagingRequisitionsToPost.length > 0) || (this.otherRequisitions && this.otherRequisitions.length > 0)) {
        this.SetBillingTxnAndTxnItemsDetails();
        this.PostProvisionalDepartmentRequisition();
      }

      //! Below code needs to be removed, after verifying.
      //to add to db in  lab testrequisition table
      // if (this.labRequisitionsToPost.length != 0) {

      //   this.labBLService.PostToRequisition(this.labRequisitionsToPost)
      //     .subscribe(
      //       res => this.CallBackPostLabRequests(res),
      //       err => {
      //         this.msgBoxServ.showMessage("error", ['failed add to lab requisition.. please check log for details.'], err.ErrorMessage);
      //         this.loading = false;
      //       });
      // }
      //to add to db in  imaging requisition table
      // if (this.ImagingRequisitionsToPost.length != 0) {

      //   this.imgBLService.PostRequestItems(this.ImagingRequisitionsToPost)
      //     .subscribe(
      //       res => this.CallBackPostImagingRequest(res),
      //       err => {
      //         this.msgBoxServ.showMessage("error", ['failed add to lab requisition.. please check log for details.'], err.ErrorMessage);
      //         this.loading = false;
      //       });
      // }
      //this is used to add other items
      // if (this.otherRequisitions && this.otherRequisitions.length && this.otherRequisitions.length > 0) {
      //   this.orderBLService.PostItemsToBilling(this.otherRequisitions)
      //     .subscribe(
      //       res => {
      //         if (res.Status == 'OK') {
      //           this.OrderResponse.others.isReqCompleted = true;
      //           this.OrderResponse.others.status = res.Status;
      //           this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      //         } else {
      //           this.OrderResponse.others.isReqCompleted = true;
      //           this.OrderResponse.others.status = res.ErrorMessage;
      //           this.DisplayRequStatus(this.OrderResponse);
      //           this.msgBoxServ.showMessage("failed", [res.ErrorMessage]);
      //           this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      //           this.loading = false;
      //         }
      //       }
      //     )
      // }

      //this is used to add data of medication in db
      if (this.medicationsToPost.length != 0) {

        let prescription: PHRMPrescription = this.SetPrescriptionDetails();
        this.orderBLService.PostPharmacyPrescription(prescription)
          .subscribe((res: DanpheHTTPResponse) => {
            if (res.Status === ENUM_DanpheHTTPResponses.OK) {
              this.OrderResponse.medication.isReqCompleted = true;
              this.OrderResponse.medication.status = res.Status;
              this.DisplayRequStatus(this.OrderResponse);
            }
            else {
              this.OrderResponse.medication.isReqCompleted = true;
              this.OrderResponse.medication.status = res.ErrorMessage;
              this.DisplayRequStatus(this.OrderResponse);
              this.msgBoxServ.showMessage(ENUM_MessageBox_Status.Failed, [res.ErrorMessage]);
            }
          }, err => {
            this.msgBoxServ.showMessage(ENUM_MessageBox_Status.Error, [err]);
          });
      }
    }

  }

  private SetPrescriptionDetails() {
    this.medicationsToPost.forEach(medItm => {
      medItm.PatientId = this.currPatVisitContext.PatientId;
      medItm.PrescriberId = this.currVisit.PerformerId;
      medItm.PerformerFullName = this.currVisit.PerformerName;
    });
    let prescription: PHRMPrescription = new PHRMPrescription();
    prescription.PHRMPrescriptionItems = this.medicationsToPost;
    prescription.PatientId = prescription.PHRMPrescriptionItems[0].PatientId;
    prescription.PrescriberId = prescription.PHRMPrescriptionItems[0].PrescriberId;
    prescription.PrescriberName = this.currVisit.PerformerName;
    return prescription;
  }

  SetBillingTxnAndTxnItemsDetails() {
    this.billingTransaction.SchemeId = this.currPatVisitContext.SchemeId;
    this.billingTransaction.PatientId = this.currPatVisitContext.PatientId;
    this.billingTransaction.PatientVisitId = this.currPatVisitContext.PatientVisitId;
    this.billingTransaction.SubTotal = 0;
    this.billingTransaction.TotalAmount = 0;
    this.billingTransaction.DiscountPercent = 0;
    this.billingTransaction.DiscountAmount = 0;
    this.billingTransaction.PaidAmount = 0;
    this.billingTransaction.CounterId = this.SelectedCounterId;


    if (this.billingTransaction.BillingTransactionItems && this.billingTransaction.BillingTransactionItems.length > 0) {
      this.billingTransaction.BillingTransactionItems.forEach(txnItem => {
        txnItem.PatientVisitId = this.currPatVisitContext.PatientVisitId;
        txnItem.PatientId = this.currPatVisitContext.PatientId;
        if (txnItem.SrvDeptIntegrationName && (txnItem.SrvDeptIntegrationName.toLowerCase() != "lab")) {
          txnItem.LabTypeName = null;
        }
        txnItem.DiscountSchemeId = this.currPatVisitContext.SchemeId;
        txnItem.PriceCategoryId = this.currPatVisitContext.PriceCategoryId;

        txnItem.BillingType = this.currPatVisitContext.VisitType !== ENUM_VisitType.inpatient ? ENUM_BillingType.outpatient : ENUM_BillingType.inpatient;
        txnItem.VisitType = this.currPatVisitContext.VisitType.toLowerCase();
        txnItem.BillStatus = ENUM_BillingStatus.provisional;// "provisional";

        txnItem.CreatedOn = moment().format("YYYY-MM-DD HH:mm:ss");
        txnItem.CreatedBy = this.securityService.GetLoggedInUser().EmployeeId;

        txnItem.CounterId = this.SelectedCounterId;
        txnItem.CounterDay = moment().format("YYYY-MM-DD");
        txnItem.DiscountSchemeId = this.billingTransaction.SchemeId;
        txnItem.CoPaymentCashAmount = 0;
        txnItem.CoPaymentCreditAmount = 0;
        txnItem.OrderStatus = ENUM_OrderStatus.Active;//'active'
      });
    }
  }

  PostProvisionalDepartmentRequisition() {
    const billingTransaction = _.cloneDeep(this.billingTransaction);
    const billingTransactionItems = _.cloneDeep(this.billingTransaction.BillingTransactionItems);
    this.billingBLService.ProceedToBillingTransaction(billingTransaction, billingTransactionItems, "active", "provisional", false, this.currPatVisitContext).subscribe(res => {
      if (res.Status === ENUM_DanpheHTTPResponses.OK && res.Results) {
        this.OrderResponse.Lab.isReqCompleted = true;
        this.OrderResponse.Lab.status = res.Status;
        this.OrderResponse.Imaging.isReqCompleted = true;
        this.OrderResponse.Imaging.status = res.Status;
        this.OrderResponse.others.isReqCompleted = true;
        this.OrderResponse.others.status = res.Status;
        this.DisplayRequStatus(this.OrderResponse);
        // this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }
      else {
        this.msgBoxServ.showMessage(ENUM_MessageBox_Status.Failed, ["Unable to complete transaction."]);
        console.log(res.ErrorMessage)
        this.loading = false;
      }
    });
  }

  //this is posting the labrequisition to billing ..but this is need to reviwed by saudarshan and dharam<20/04/2017>
  CallBackPostLabRequests(res): void {
    if (res.Status == 'OK') {
      this.labBLService.PostToBilling(res.Results).
        subscribe(res1 => {
          if (res1.Status == 'OK') {
            //alert("lab order added successfully");
            //this.router.navigate(['/Dashboard/PatientOverviewMain']);
            //this is temporary solution...to avoid to alert after posting and showing the status of  lab and imaging  requistion
            this.OrderResponse.Lab.isReqCompleted = true;
            this.OrderResponse.Lab.status = res1.Status;
            this.DisplayRequStatus(this.OrderResponse);
            //this.ordServ.labTests = [];
          } else {
            //this is temporary solution...to avoid to alert after posting and showing the status of  lab and imaging  requistion
            this.OrderResponse.Lab.isReqCompleted = true;
            this.OrderResponse.Lab.status = res1.ErrorMessage;
            this.DisplayRequStatus(this.OrderResponse);
            this.msgBoxServ.showMessage("failed", [res1.ErrorMessage]);

          }
        },
          err => {
            this.msgBoxServ.showMessage("error", ['lab failed to post to billing.. please check log for details.'], err.ErrorMessage);
          });
    }
    else {
      //this is temporary solution...to avoid to alert after posting and showing the status of  lab and imaging  requistion
      this.OrderResponse.Lab.isReqCompleted = true;
      this.OrderResponse.Lab.status = res.ErrorMessage;
      this.DisplayRequStatus(this.OrderResponse);
      this.msgBoxServ.showMessage("failed", [res.ErrorMessage]);
    }
  }
  //this is posting the imagingrequisition to billing ..but this is need to reviwed by saudarshan and dharam<20/04/2017>
  CallBackPostImagingRequest(res) {
    if (res.Status == "OK") {
      // after successfully added to requisition table adds to the billing table
      this.imgBLService.PostToBilling(res.Results)
        .subscribe(res1 => {
          if (res1.Status == 'OK') {
            //this is temporary solution...to avoid to alert after posting and showing the status of  lab and imaging  requistion
            this.OrderResponse.Imaging.isReqCompleted = true;
            this.OrderResponse.Imaging.status = res1.Status;
            this.DisplayRequStatus(this.OrderResponse);
            //this.ordServ.imagingItems = [];

          } else {
            //this is temporary solution...to avoid to alert after posting and showing the status of  lab and imaging  requistion
            this.OrderResponse.Imaging.isReqCompleted = true;
            this.OrderResponse.Imaging.status = res1.ErrorMessage;
            this.DisplayRequStatus(this.OrderResponse);
            this.msgBoxServ.showMessage("failed", [res1.ErrorMessage]);
          }
        },
          err => {
            this.msgBoxServ.showMessage("error", ['Imaging failed to post  to billing.. please check log for details.'], err.ErrorMessage);

          });
    }
    else {
      //this is temporary solution...to avoid to alert after posting and showing the status of  lab and imaging  requistion
      this.OrderResponse.Imaging.isReqCompleted = true;
      this.OrderResponse.Imaging.status = res.ErrorMessage;
      this.DisplayRequStatus(this.OrderResponse);
      this.DisplayRequStatus(this.OrderResponse);
      this.msgBoxServ.showMessage("failed", [res.ErrorMessage]);
    }
  }

  //this is temporary solution(we have to look for something more better)...to avoid to alert after posting and showing the status of  lab and imaging  requistion
  //to display status after posting the requisition
  DisplayRequStatus(OrderResponse) {
    //if both process(adding lab and imaging to requisition table) is over then only check for status..and show proper message
    if (OrderResponse.Lab.isReqCompleted == true && OrderResponse.Imaging.isReqCompleted == true && OrderResponse.medication.isReqCompleted == true) {
      //if all order added properly
      if (OrderResponse.Lab.status == 'OK' && OrderResponse.Imaging.status == 'OK' && OrderResponse.medication.status == 'OK') {
        this.msgBoxServ.showMessage("success", ["orders added successfully"]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }
      //if lab fail
      else if (OrderResponse.Lab.status != 'OK' && OrderResponse.Imaging.status == 'OK' && OrderResponse.medication.status == 'OK') {
        this.msgBoxServ.showMessage("success", ["Imaging and medication add successfully but lab fails"]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);

      }
      //if medication fails
      else if (OrderResponse.Lab.status == 'OK' && OrderResponse.Imaging.status == 'OK' && OrderResponse.medication.status != 'OK') {
        this.msgBoxServ.showMessage("success", ["Imaging and Lab add successfully but medication fails"]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }
      //if Imaging fails
      else if (OrderResponse.Lab.status == 'OK' && OrderResponse.Imaging.status != 'OK' && OrderResponse.medication.status == 'OK') {
        this.msgBoxServ.showMessage("success", ["Imaging and Lab add successfully but Imaging fails"]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }
      //if Lab and Imaging fails
      else if (OrderResponse.Lab.status != 'OK' && OrderResponse.Imaging.status != 'OK' && OrderResponse.medication.status == 'OK') {
        this.msgBoxServ.showMessage("success", ["medication add successfully but Lab and Imaging fails"]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }
      //if Lab and medication fails
      else if (OrderResponse.Lab.status != 'OK' && OrderResponse.Imaging.status == 'OK' && OrderResponse.medication.status != 'OK') {
        this.msgBoxServ.showMessage("success", ["Imaging add successfully but Lab and medication fails"]);
        alert('');
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }
      //if Imaging and medication fails
      else if (OrderResponse.Lab.status == 'OK' && OrderResponse.Imaging.status != 'OK' && OrderResponse.medication.status != 'OK') {
        this.msgBoxServ.showMessage("success", ["Lab add successfully but Lab and Imaging fails"]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }
      else {
        this.msgBoxServ.showMessage("failed", ["Failed to add  order"]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }
    }
    //------------------------------------------------------------------------------------------
    //for 2 order
    //if there is order of lab and imaging
    else if (OrderResponse.Lab.isReqCompleted == true && OrderResponse.Imaging.isReqCompleted == true && this.medicationsToPost.length == 0) {
      if (OrderResponse.Lab.status == 'OK' && OrderResponse.Imaging.status == 'OK') {
        this.msgBoxServ.showMessage("success", ["Imaging and lab order add successfully"]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }
      //if Imaging order added properly ..but lab is not added properly
      else if (OrderResponse.Lab.status != 'OK' && OrderResponse.Imaging.status == 'OK') {
        this.msgBoxServ.showMessage("success", ["Imaging order add successfully but Failed to add Lab order"]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }
      //if lab order added properly ..but Imaging is not added properly
      else if (OrderResponse.Lab.status == 'OK' && OrderResponse.Imaging.status != 'OK') {
        this.msgBoxServ.showMessage("success", ["Lab order add successfully but Failed to add Imaging order"]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }
      //if both order is not added properly
      else {
        this.msgBoxServ.showMessage("failed", ["Failed to add Imaging order & Lab order "]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }

    }

    //-----------------------------------------------------------------------------------------------------------------
    //if there is order of lab and medications
    else if (OrderResponse.Lab.isReqCompleted == true && OrderResponse.medication.isReqCompleted == true && this.ImagingRequisitionsToPost.length == 0) {
      if (OrderResponse.Lab.status == 'OK' && OrderResponse.medication.status == 'OK') {
        this.msgBoxServ.showMessage("success", ["lab and medication order add successfully"]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }
      //if Imaging order added properly ..but lab is not added properly
      else if (OrderResponse.Lab.status != 'OK' && OrderResponse.medication.status == 'OK') {
        this.msgBoxServ.showMessage("success", ["medications order add successfully but Failed to add Lab order "]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }
      //if lab order added properly ..but Imaging is not added properly
      else if (OrderResponse.Lab.status == 'OK' && OrderResponse.medication.status != 'OK') {
        this.msgBoxServ.showMessage("success", ["Lab order add successfully but Failed to add medications order"]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }
      //if both order is not added properly
      else {
        this.msgBoxServ.showMessage("failed", ["Failed to add Medications order & Lab order"]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }

    }
    //---------------------------------------------------------------------------------------------------------------
    //if there is order of medications and imaging
    else if (OrderResponse.medication.isReqCompleted == true && OrderResponse.Imaging.isReqCompleted == true && this.labRequisitionsToPost.length == 0) {
      if (OrderResponse.medication.status == 'OK' && OrderResponse.Imaging.status == 'OK') {
        this.msgBoxServ.showMessage("success", ["Imaging and Medications order add successfully "]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }
      //if Imaging order added properly ..but lab is not added properly
      else if (OrderResponse.medication.status != 'OK' && OrderResponse.Imaging.status == 'OK') {
        this.msgBoxServ.showMessage("success", ["Imaging order add successfully but Failed to add Lab order"]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }
      //if lab order added properly ..but Imaging is not added properly
      else if (OrderResponse.medication.status == 'OK' && OrderResponse.Imaging.status != 'OK') {
        this.msgBoxServ.showMessage("success", ["Medications order add successfully but Failed to add Imaging order"]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }
      //if both order is not added properly
      else {
        this.msgBoxServ.showMessage("failed", [" Failed to add Imaging order & Medications order "]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }

    }
    //-----------------------------------------------------------------------------------------------------------------------
    //this condition is used only if lab order is added..
    else if (OrderResponse.Lab.isReqCompleted == true && this.ImagingRequisitionsToPost.length == 0 && this.medicationsToPost.length == 0) {
      if (OrderResponse.Lab.status == 'OK') {
        this.msgBoxServ.showMessage("success", ["Lab order add successfully"]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }
      else {
        this.msgBoxServ.showMessage("failed", ["Lab  Failed to add  order "]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }

    }
    //-----------------------------------------------------------------------------------------------------------------------
    //this condition is used only if Imaging order is added..
    else if (OrderResponse.Imaging.isReqCompleted == true && this.labRequisitionsToPost.length == 0 && this.medicationsToPost.length == 0) {
      if (OrderResponse.Imaging.status == 'OK') {
        this.msgBoxServ.showMessage("success", ["Imaging order add successfully"]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }
      else {
        this.msgBoxServ.showMessage("failed", ["Failed to add  Imaging order "]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }

    }
    //-----------------------------------------------------------------------------------------------------------------------
    //this condition is used only if medications order is added..
    else if (OrderResponse.medication.isReqCompleted == true && this.labRequisitionsToPost.length == 0 && this.ImagingRequisitionsToPost.length == 0) {
      if (OrderResponse.medication.status == 'OK') {
        this.msgBoxServ.showMessage("success", ["medications order add successfully"]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }
      else {
        this.msgBoxServ.showMessage("failed", ["Failed to add  Imaging order"]);
        this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
      }

    }

    this.loading = false;

  }


  //temporary method kept here. move it to proper place: sud-6feb18
  public GetPrescriptionItemsMapped(prescItems: Array<PHRMPrescriptionItem>): string {

    let newPrescriptionItems = prescItems.map(item => {
      return _.omit(item, ['PHRMPrescriptionItemsValidator', 'ItemListByGeneric']);
    });

    let data = JSON.stringify(newPrescriptionItems);
    return data;
  }

  public GetLabItemsMapped(selItems: Array<OrderItemsVM>): Array<LabTestRequisition> {
    let retLabReqList: Array<LabTestRequisition> = [];
    let allLabTests = this.ordServ.allLabtests;

    if (selItems && selItems.length > 0) {
      selItems.forEach(itm => {

        let billingTransactionItems = new BillingTransactionItem();
        billingTransactionItems.ServiceItemId = itm.ServiceItemId;
        billingTransactionItems.ServiceDepartmentId = itm.ServiceDepartmentId;
        billingTransactionItems.ServiceDepartmentName = itm.ServiceDepartmentName;
        billingTransactionItems.ItemCode = itm.ItemCode;
        billingTransactionItems.ItemName = itm.ItemName;
        billingTransactionItems.Price = itm.Price;
        billingTransactionItems.Quantity = 1;//hardcoded 1 quantity
        billingTransactionItems.SubTotal = (billingTransactionItems.Price * billingTransactionItems.Quantity);
        billingTransactionItems.DiscountPercent = 0;
        billingTransactionItems.DiscountAmount = 0;
        billingTransactionItems.TotalAmount = billingTransactionItems.SubTotal;
        billingTransactionItems.IntegrationItemId = itm.IntegrationItemId;
        billingTransactionItems.PrescriberId = this.currVisit.PerformerId;
        billingTransactionItems.PrescriberName = this.currVisit.PerformerName;

        this.billingTransaction.BillingTransactionItems.push(billingTransactionItems);

        //below code might not be needed.
        let labTest = allLabTests.find(tst => tst.LabTestId == itm.IntegrationItemId);

        let currReq = new LabTestRequisition();
        currReq.LabTestId = labTest.LabTestId;
        currReq.LabTestName = labTest.LabTestName;
        currReq.LabTestSpecimen = labTest.LabTestSpecimen;
        currReq.LabTestSpecimenSource = labTest.LabTestSpecimenSource;
        currReq.ProcedureCode = labTest.ProcedureCode;
        //Lonic Code should come from database.....but for now  it is hard coded value
        currReq.LOINC = "LONIC Code";
        currReq.OrderStatus = "active";
        currReq.BillingStatus = "unpaid";
        currReq.PatientId = this.currPatient.PatientId;
        currReq.PatientName = this.currPatient.FirstName + " " + this.currPatient.LastName;
        currReq.PatientVisitId = this.currVisit.PatientVisitId;
        currReq.PrescriberName = this.currVisit.PerformerName;
        currReq.PrescriberId = this.currVisit.PerformerId;
        currReq.CreatedBy = this.currUser.EmployeeId;
        currReq.CreatedOn = this.currTime;
        currReq.DiagnosisId = null;
        currReq.VisitType = this.currPatVisitContext.VisitType;
        currReq.WardName = this.currPatVisitContext.Current_WardBed;
        currReq.OrderDateTime = moment().format("YYYY-MM-DD HH:mm:ss");
        retLabReqList.push(currReq);
      });
    }
    return retLabReqList;
  }

  public GetImagingItemsMapped(selItems: Array<OrderItemsVM>): Array<ImagingItemRequisition> {

    let retImgReqList: Array<ImagingItemRequisition> = [];
    let allImgItems = this.ordServ.allImagingItems;
    if (selItems && selItems.length > 0) {
      selItems.forEach(itm => {

        let billingTransactionItems = new BillingTransactionItem();
        billingTransactionItems.ServiceItemId = itm.ServiceItemId;
        billingTransactionItems.ServiceDepartmentId = itm.ServiceDepartmentId;
        billingTransactionItems.ServiceDepartmentName = itm.ServiceDepartmentName;
        billingTransactionItems.ItemCode = itm.ItemCode;
        billingTransactionItems.ItemName = itm.ItemName;
        billingTransactionItems.Price = itm.Price;
        billingTransactionItems.Quantity = 1;//hardcoded 1 quantity
        billingTransactionItems.SubTotal = (billingTransactionItems.Price * billingTransactionItems.Quantity);
        billingTransactionItems.DiscountPercent = 0;
        billingTransactionItems.DiscountAmount = 0;
        billingTransactionItems.TotalAmount = billingTransactionItems.SubTotal;
        billingTransactionItems.IntegrationItemId = itm.IntegrationItemId;
        billingTransactionItems.PrescriberId = this.currVisit.PerformerId;
        billingTransactionItems.PrescriberName = this.currVisit.PerformerName;

        this.billingTransaction.BillingTransactionItems.push(billingTransactionItems);


        let imgItem = allImgItems.find(img => img.ImagingItemId == itm.IntegrationItemId);
        let currReq = new ImagingItemRequisition();
        currReq.ImagingItemId = imgItem.ImagingItemId;
        currReq.ImagingItemName = imgItem.ImagingItemName;
        currReq.ImagingTypeId = imgItem.ImagingTypeId;
        currReq.ProcedureCode = imgItem.ProcedureCode;
        currReq.PatientId = this.currPatient.PatientId;
        currReq.PatientVisitId = this.currVisit.PatientVisitId;
        currReq.PrescriberId = this.currVisit.PerformerId;
        currReq.PrescriberName = this.currVisit.PerformerName;
        currReq.OrderStatus = "active";
        currReq.BillingStatus = "unpaid";
        currReq.DiagnosisId = null;
        retImgReqList.push(currReq);
      });
    }
    return retImgReqList;
  }

  public GetMedicationItemsMapped(selItems: Array<OrderItemsVM>): Array<PHRMPrescriptionItem> {

    let retMedReqList: Array<PHRMPrescriptionItem> = [];
    let allMedItms = this.ordServ.allMedicationItems;

    let defaultMed = new PHRMPrescriptionItem();


    if (selItems && selItems.length > 0) {
      selItems.forEach(itm => {

        let currMed = new PHRMItemMasterModel();
        let currGeneric = new PHRMGenericModel();

        //incase of generic, we have GenericId as Itemid.
        // if (itm.IsGeneric) {
        //   currGeneric = this.ordServ.allGenericItems.find(gen => gen.GenericId == itm.ItemId);
        //   //currMed = allMedItms.find(med => med.ItemId == itm.ItemId);
        // } else {
        //   currMed = allMedItms.find(med => med.ItemId == itm.ItemId);
        //   currGeneric = this.ordServ.allGenericItems.find(gen => gen.GenericId == itm.GenericId);
        // }

        //No need to check, IsGeneric field. 
        currMed = allMedItms.find(med => med.ItemId == itm.ItemId);
        currGeneric = this.ordServ.allGenericItems.find(gen => gen.GenericId == itm.GenericId);

        let newReq = new PHRMPrescriptionItem();


        newReq.ItemId = currMed.ItemId;
        newReq.CreatedBy = this.currUser.EmployeeId;
        newReq.CreatedOn = this.currTime;
        newReq.Frequency = itm.Frequency ? itm.Frequency : 0;
        newReq.HowManyDays = 0;
        newReq.ItemName = currMed.ItemName;
        newReq.PatientId = this.currPatient.PatientId;
        newReq.Dosage = itm.Dosage ? itm.Dosage : currMed.Dosage;//if current item has dosage, then fill it as it is.
        newReq.Notes = "";
        newReq.OrderStatus = "active";
        newReq.Route = itm.Route ? itm.Route : "mouth";
        // newReq.ProviderId = this.currVisit.ProviderId;
        newReq.GenericId = currGeneric.GenericId;
        newReq.GenericName = currGeneric.GenericName;
        newReq.PrescriberId = this.currVisit.PerformerId;
        newReq.DiagnosisId = null;
        //get all ItemsList for current generic to display in dropdown.
        newReq.ItemListByGeneric = allMedItms.filter(med => med.GenericId == currGeneric.GenericId);
        newReq.ItemListByGeneric.unshift(this.GetDefaultMedItem());
        retMedReqList.push(newReq);
      });
    }
    return retMedReqList;
  }

  public GetOtherItemsMapped(selItems: Array<OrderItemsVM>): Array<BillItemRequisition> {
    let retOtherReqList: Array<BillItemRequisition> = [];
    let allOtherItems = this.ordServ.allOtherItems;

    selItems.forEach(itm => {

      let billingTransactionItems = new BillingTransactionItem();
      billingTransactionItems.ServiceItemId = itm.ServiceItemId;
      billingTransactionItems.ServiceDepartmentId = itm.ServiceDepartmentId;
      billingTransactionItems.ServiceDepartmentName = itm.ServiceDepartmentName;
      billingTransactionItems.ItemCode = itm.ItemCode;
      billingTransactionItems.ItemName = itm.ItemName;
      billingTransactionItems.Price = itm.Price;
      billingTransactionItems.Quantity = 1;//hardcoded 1 quantity
      billingTransactionItems.SubTotal = (billingTransactionItems.Price * billingTransactionItems.Quantity);
      billingTransactionItems.DiscountPercent = 0;
      billingTransactionItems.DiscountAmount = 0;
      billingTransactionItems.TotalAmount = billingTransactionItems.SubTotal;
      billingTransactionItems.IntegrationItemId = itm.IntegrationItemId;
      billingTransactionItems.PrescriberId = this.currVisit.PerformerId;
      billingTransactionItems.PrescriberName = this.currVisit.PerformerName;

      this.billingTransaction.BillingTransactionItems.push(billingTransactionItems);


      let singleItem = itm;//allOtherItems.find(item => item.ItemId == itm.IntegrationItemId);
      let currReq = new BillItemRequisition();

      currReq.ItemId = singleItem.ItemId;
      currReq.ItemName = singleItem.ItemName;
      currReq.PatientId = this.currPatient.PatientId;
      currReq.PatientVisitId = this.currVisit.PatientVisitId;
      currReq.Quantity = 1;
      currReq.ServiceDepartmentId = singleItem.ServiceDepartmentId;
      // currReq.ProcedureCode = singleItem.ProcedureCode;
      currReq.PerformerId = this.currVisit.PerformerId;
      currReq.Price = singleItem.Price;
      currReq.CreatedBy = this.securityService.GetLoggedInUser().EmployeeId;
      currReq.CreatedOn = moment().format('YYYY-MM-DD');
      currReq.DepartmentName = singleItem.ServiceDepartmentName;
      currReq.AssignedTo = this.currVisit.PerformerId;

      retOtherReqList.push(currReq);
    });


    // if (selItems && selItems.length > 0) {
    //     selItems.forEach(itm => {
    //         let singleItem = allOtherItems.find(item => item.ItemId == itm.ItemId);
    //         let currReq = new BillItemRequisition();

    //         currReq.ItemId = singleItem.ItemId;
    //         currReq.ItemName = singleItem.ItemName;
    //         currReq.PatientId = this.currPatient.PatientId;
    //         currReq.PatientVisitId = this.currVisit.PatientVisitId;
    //         currReq.Quantity = 1;
    //         currReq.ServiceDepartmentId = singleItem.ServiceDepartmentId;
    //         currReq.ProcedureCode = singleItem.ProcedureCode;
    //         currReq.ProviderId = this.currVisit.ProviderId;
    //         currReq.Price = singleItem.Price;
    //         currReq.CreatedBy = this.securityService.GetLoggedInUser().EmployeeId;
    //         currReq.CreatedOn = moment().format('YYYY-MM-DD');
    //         currReq.DepartmentName = singleItem.ServiceDepartmentName;
    //         currReq.AssignedTo = this.currVisit.ProviderId;

    //         retOtherReqList.push(currReq);
    //     });
    // }
    return retOtherReqList;
  }

  //Returns a default item if user wants to select only by generic name.
  GetDefaultMedItem(): PHRMPrescriptionItem {
    let defItem = new PHRMPrescriptionItem();
    defItem.ItemName = "--Any--";
    defItem.ItemId = 0;
    defItem.Dosage = "N/A";
    return defItem;
  }

  //we need to change the dosage on change of current brand name.
  MedicineDDLOnChange(indx) {
    let currItm = this.medications[indx];
    let currItm2 = currItm.ItemListByGeneric.find(itm => itm.ItemId == currItm.ItemId);
    currItm.Dosage = currItm2.Dosage;
    currItm.ItemName = currItm2.ItemName;
  }

  CancelOrders() {
    this.router.navigate(['/Doctors/PatientOverviewMain/Orders']);
  }
}
