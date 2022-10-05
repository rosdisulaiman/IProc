using System;
using System.Data;
using System.Collections.Generic;
using System.Linq;
using IProc.Data;

namespace IProc.Models
{
    public enum UsersDataField
    {

        UserID,

        UserNric,

        UserName,

        FullName,

        Email,

        UserPosition,

        UserGrade,

        UserPhone,

        PtjCode,

        PtjName,

        UserStatus,

        UserDate,

        Password,

        Comment,

        PasswordQuestion,

        PasswordAnswer,

        IsApproved,

        LastActivityDate,

        LastLoginDate,

        LastPasswordChangedDate,

        CreationDate,

        IsLockedOut,

        LastLockedOutDate,

        FailedPasswordAttemptCount,

        FailedPasswordAttemptWindowStart,

        FailedPasswordAnswerAttemptCount,

        FailedPasswordAnswerAttemptWindowStart,

        Roles,

        ConfirmPassword,

        RoleID,
    }

    public partial class UsersModel : BusinessRulesObjectModel
    {

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private int? _userID;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private string _userNric;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private string _userName;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private string _fullName;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private string _email;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private string _userPosition;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private string _userGrade;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private string _userPhone;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private int? _ptjCode;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private string _ptjName;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private int? _userStatus;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private string _userDate;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private string _password;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private string _comment;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private string _passwordQuestion;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private string _passwordAnswer;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private bool? _isApproved;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private DateTime? _lastActivityDate;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private DateTime? _lastLoginDate;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private DateTime? _lastPasswordChangedDate;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private DateTime? _creationDate;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private bool? _isLockedOut;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private DateTime? _lastLockedOutDate;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private int? _failedPasswordAttemptCount;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private DateTime? _failedPasswordAttemptWindowStart;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private int? _failedPasswordAnswerAttemptCount;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private DateTime? _failedPasswordAnswerAttemptWindowStart;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private string _roles;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private string _confirmPassword;

        [System.Diagnostics.DebuggerBrowsable(System.Diagnostics.DebuggerBrowsableState.Never)]
        private int? _roleID;

        public UsersModel()
        {
        }

        public UsersModel(BusinessRules r) :
                base(r)
        {
        }

        public int? UserID
        {
            get
            {
                return _userID;
            }
            set
            {
                _userID = value;
                UpdateFieldValue("UserID", value);
            }
        }

        public string UserNric
        {
            get
            {
                return _userNric;
            }
            set
            {
                _userNric = value;
                UpdateFieldValue("UserNric", value);
            }
        }

        public string UserName
        {
            get
            {
                return _userName;
            }
            set
            {
                _userName = value;
                UpdateFieldValue("UserName", value);
            }
        }

        public string FullName
        {
            get
            {
                return _fullName;
            }
            set
            {
                _fullName = value;
                UpdateFieldValue("FullName", value);
            }
        }

        public string Email
        {
            get
            {
                return _email;
            }
            set
            {
                _email = value;
                UpdateFieldValue("Email", value);
            }
        }

        public string UserPosition
        {
            get
            {
                return _userPosition;
            }
            set
            {
                _userPosition = value;
                UpdateFieldValue("UserPosition", value);
            }
        }

        public string UserGrade
        {
            get
            {
                return _userGrade;
            }
            set
            {
                _userGrade = value;
                UpdateFieldValue("UserGrade", value);
            }
        }

        public string UserPhone
        {
            get
            {
                return _userPhone;
            }
            set
            {
                _userPhone = value;
                UpdateFieldValue("UserPhone", value);
            }
        }

        public int? PtjCode
        {
            get
            {
                return _ptjCode;
            }
            set
            {
                _ptjCode = value;
                UpdateFieldValue("PtjCode", value);
            }
        }

        public string PtjName
        {
            get
            {
                return _ptjName;
            }
            set
            {
                _ptjName = value;
                UpdateFieldValue("PtjName", value);
            }
        }

        public int? UserStatus
        {
            get
            {
                return _userStatus;
            }
            set
            {
                _userStatus = value;
                UpdateFieldValue("UserStatus", value);
            }
        }

        public string UserDate
        {
            get
            {
                return _userDate;
            }
            set
            {
                _userDate = value;
                UpdateFieldValue("UserDate", value);
            }
        }

        public string Password
        {
            get
            {
                return _password;
            }
            set
            {
                _password = value;
                UpdateFieldValue("Password", value);
            }
        }

        public string Comment
        {
            get
            {
                return _comment;
            }
            set
            {
                _comment = value;
                UpdateFieldValue("Comment", value);
            }
        }

        public string PasswordQuestion
        {
            get
            {
                return _passwordQuestion;
            }
            set
            {
                _passwordQuestion = value;
                UpdateFieldValue("PasswordQuestion", value);
            }
        }

        public string PasswordAnswer
        {
            get
            {
                return _passwordAnswer;
            }
            set
            {
                _passwordAnswer = value;
                UpdateFieldValue("PasswordAnswer", value);
            }
        }

        public bool? IsApproved
        {
            get
            {
                return _isApproved;
            }
            set
            {
                _isApproved = value;
                UpdateFieldValue("IsApproved", value);
            }
        }

        public DateTime? LastActivityDate
        {
            get
            {
                return _lastActivityDate;
            }
            set
            {
                _lastActivityDate = value;
                UpdateFieldValue("LastActivityDate", value);
            }
        }

        public DateTime? LastLoginDate
        {
            get
            {
                return _lastLoginDate;
            }
            set
            {
                _lastLoginDate = value;
                UpdateFieldValue("LastLoginDate", value);
            }
        }

        public DateTime? LastPasswordChangedDate
        {
            get
            {
                return _lastPasswordChangedDate;
            }
            set
            {
                _lastPasswordChangedDate = value;
                UpdateFieldValue("LastPasswordChangedDate", value);
            }
        }

        public DateTime? CreationDate
        {
            get
            {
                return _creationDate;
            }
            set
            {
                _creationDate = value;
                UpdateFieldValue("CreationDate", value);
            }
        }

        public bool? IsLockedOut
        {
            get
            {
                return _isLockedOut;
            }
            set
            {
                _isLockedOut = value;
                UpdateFieldValue("IsLockedOut", value);
            }
        }

        public DateTime? LastLockedOutDate
        {
            get
            {
                return _lastLockedOutDate;
            }
            set
            {
                _lastLockedOutDate = value;
                UpdateFieldValue("LastLockedOutDate", value);
            }
        }

        public int? FailedPasswordAttemptCount
        {
            get
            {
                return _failedPasswordAttemptCount;
            }
            set
            {
                _failedPasswordAttemptCount = value;
                UpdateFieldValue("FailedPasswordAttemptCount", value);
            }
        }

        public DateTime? FailedPasswordAttemptWindowStart
        {
            get
            {
                return _failedPasswordAttemptWindowStart;
            }
            set
            {
                _failedPasswordAttemptWindowStart = value;
                UpdateFieldValue("FailedPasswordAttemptWindowStart", value);
            }
        }

        public int? FailedPasswordAnswerAttemptCount
        {
            get
            {
                return _failedPasswordAnswerAttemptCount;
            }
            set
            {
                _failedPasswordAnswerAttemptCount = value;
                UpdateFieldValue("FailedPasswordAnswerAttemptCount", value);
            }
        }

        public DateTime? FailedPasswordAnswerAttemptWindowStart
        {
            get
            {
                return _failedPasswordAnswerAttemptWindowStart;
            }
            set
            {
                _failedPasswordAnswerAttemptWindowStart = value;
                UpdateFieldValue("FailedPasswordAnswerAttemptWindowStart", value);
            }
        }

        public string Roles
        {
            get
            {
                return _roles;
            }
            set
            {
                _roles = value;
                UpdateFieldValue("Roles", value);
            }
        }

        public string ConfirmPassword
        {
            get
            {
                return _confirmPassword;
            }
            set
            {
                _confirmPassword = value;
                UpdateFieldValue("ConfirmPassword", value);
            }
        }

        public int? RoleID
        {
            get
            {
                return _roleID;
            }
            set
            {
                _roleID = value;
                UpdateFieldValue("RoleID", value);
            }
        }

        public FieldValue this[UsersDataField field]
        {
            get
            {
                return this[field.ToString()];
            }
        }
    }
}
