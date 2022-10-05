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
        /// with a command name that matches "Update".
        /// </summary>
        [Rule("r102")]
        public void r102Implementation(
                    FieldValue userID,
                    string userName,
                    FieldValue password,
                    FieldValue email,
                    FieldValue comment,
                    FieldValue passwordQuestion,
                    FieldValue passwordAnswer,
                    FieldValue isApproved,
                    DateTime? lastActivityDate,
                    DateTime? lastLoginDate,
                    DateTime? lastPasswordChangedDate,
                    DateTime? creationDate,
                    FieldValue isLockedOut,
                    DateTime? lastLockedOutDate,
                    int? failedPasswordAttemptCount,
                    DateTime? failedPasswordAttemptWindowStart,
                    int? failedPasswordAnswerAttemptCount,
                    DateTime? failedPasswordAnswerAttemptWindowStart,
                    FieldValue roles)
        {
            // prevent execution of CRUD operations by the application framework
            PreventDefault();
            // get user object by name
            MembershipUser user = Membership.GetUser(userName);
            if (user != null)
            {
                // update "Email" if changed
                if (email.Modified)
                {
                    user.Email = Convert.ToString(email.Value);
                    Membership.UpdateUser(user);
                }
                // update "Is Approved" if changed
                if (isApproved.Modified)
                {
                    user.IsApproved = Convert.ToBoolean(isApproved.Value);
                    Membership.UpdateUser(user);
                }
                // unlock user account if necessary
                if (isLockedOut.Modified)
                {
                    if (Convert.ToBoolean(isLockedOut.Value))
                    {
                        Result.Focus("IsLockedOut", Localize("UserCannotBeLockedOut",
                            "User cannot be locked out. If you want to prevent this " +
                            "user from being able to login then simply mark user as" +
                            " \'Not Approved\'."));
                        throw new Exception(Localize("ErrorSavingUser",
                            "Error saving user account."));
                    }
                    user.UnlockUser();
                }
                // update "Comment" if changed
                if (comment.Modified)
                {
                    user.Comment = Convert.ToString(comment.Value);
                    Membership.UpdateUser(user);
                }
                // update "Roles" if changed
                if (roles.Modified)
                {
                    string[] newRoles = Convert.ToString(roles.Value).Split(',');
                    string[] oldRoles = System.Web.Security.Roles.GetRolesForUser(
                        user.UserName);
                    foreach (string role in oldRoles)
                        if (!(String.IsNullOrEmpty(role)) && (Array.IndexOf(
                            newRoles, role) == -1))
                            System.Web.Security.Roles.RemoveUserFromRole(
                                user.UserName, role);
                    foreach (string role in newRoles)
                        if (!(String.IsNullOrEmpty(role)) &&
                            (Array.IndexOf(oldRoles, role) == -1))
                            System.Web.Security.Roles.AddUserToRole(
                                user.UserName, role);
                }
            }
        }
    }
}
