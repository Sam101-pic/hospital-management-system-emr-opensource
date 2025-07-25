﻿using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DanpheEMR.ServerModel.ClinicalModel_New
{
    public class ClinicalMasterNotesMapping
    {
        [Key]
        public int ClinicalMapComponentId { get; set; }
        public int? DepartmentId { get; set; }
        public int ClinicalNotesMasterId { get; set; }
        public int ClinicalFieldId { get; set; }
        public int DisplaySequence { get; set; }
        public int? EmployeeId { get; set; }
        public int CreatedBy { get; set; }
        public DateTime CreatedOn { get; set; }
        public int? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public bool IsActive { get; set; }
    }
}
