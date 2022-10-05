using System;
using System.Data;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Web;
using System.Web.Security;
using IProc.Data;
using IProc.Models;

namespace IProc.Rules
{
    public partial class UsersBusinessRules : IProc.Data.BusinessRules
    {

        /// <summary>This method will execute in any view before an action
        /// with a command name that matches "Insert".
        /// </summary>
        [Rule("r101")]
        public void r101Implementation(
                    FieldValue userID,
                    string userName,
                    string password,
                    string email,
                    string comment,
                    string passwordQuestion,
                    string passwordAnswer,
                    bool isApproved,
                    DateTime? lastActivityDate,
                    DateTime? lastLoginDate,
                    DateTime? lastPasswordChangedDate,
                    DateTime? creationDate,
                    bool? isLockedOut,
                    DateTime? lastLockedOutDate,
                    int? failedPasswordAttemptCount,
                    DateTime? failedPasswordAttemptWindowStart,
                    int? failedPasswordAnswerAttemptCount,
                    DateTime? failedPasswordAnswerAttemptWindowStart,
                    string roles,
                    string confirmPassword,
                    int? roleID)
        {
            // prevent execution of CRUD operations by the application framework
            PreventDefault();
            // ensure that "Password" and "ConfirmPassword" match
            if (password != confirmPassword)
                throw new Exception(Localize("PasswordAndConfirmationDoNotMatch",
                    "Password and confirmation do not match"));
            // create a user with the Membership API
            MembershipCreateStatus status;
            MembershipUser newUser = Membership.CreateUser(userName, password, email,
                passwordQuestion, passwordAnswer, isApproved, out status);
            // analyze and report any errors
            if (status != MembershipCreateStatus.Success)
            {
                string error = null;
                switch (status)
                {
                    case MembershipCreateStatus.DuplicateEmail:
                        error = "Duplicate email address.";
                        break;
                    case MembershipCreateStatus.DuplicateProviderUserKey:
                        error = "Duplicate provider key";
                        break;
                    case MembershipCreateStatus.DuplicateUserName:
                        error = "Duplicate user name.";
                        break;
                    case MembershipCreateStatus.InvalidAnswer:
                        error = "Invalid password recovery answer.";
                        break;
                    case MembershipCreateStatus.InvalidEmail:
                        error = "Invalid email address.";
                        break;
                    case MembershipCreateStatus.InvalidPassword:
                        error = string.Format("Invalid password. Requires at least {0} " +
                            "characters and {1} non-alphanumeric characters.",
                            Membership.Provider.MinRequiredPasswordLength,
                            Membership.Provider.MinRequiredNonAlphanumericCharacters);
                        break;
                    case MembershipCreateStatus.InvalidProviderUserKey:
                        error = "Invalid provider user key.";
                        break;
                    case MembershipCreateStatus.InvalidQuestion:
                        error = "Invalid password recovery question.";
                        break;
                    case MembershipCreateStatus.InvalidUserName:
                        error = "Invalid user name.";
                        break;
                    case MembershipCreateStatus.ProviderError:
                        error = "Provider error.";
                        break;
                    case MembershipCreateStatus.UserRejected:
                        error = "User has been rejected.";
                        break;
                }
                throw new Exception(error);
            }
            // assign "Comment" to the new user
            if (!(String.IsNullOrEmpty(comment)))
            {
                newUser.Comment = comment;
                Membership.UpdateUser(newUser);
            }
            // assign "Roles" to the new user
            if (!(String.IsNullOrEmpty(roles)))
            {
                string[] newRoles = Convert.ToString(roles).Split(',');
                foreach (string role in newRoles)
                    if (!(String.IsNullOrEmpty(role)))
                        System.Web.Security.Roles.AddUserToRole(
                            userName, role);
            }
        }
    }
}
