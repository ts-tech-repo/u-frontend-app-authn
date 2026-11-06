import { useEffect, useState } from "react";
import { connect } from "react-redux";

import { getConfig } from "@edx/frontend-platform";
import { useIntl } from "@edx/frontend-platform/i18n";
import { Form, Icon, Spinner, StatefulButton, Tab, Tabs } from "@openedx/paragon";
import { ChevronLeft } from "@openedx/paragon/icons";
import PropTypes from "prop-types";
import { Helmet } from "react-helmet";
import { useNavigate, useParams } from "react-router-dom";

import { resetPassword, validateToken } from "./data/actions";
import {
  FORM_SUBMISSION_ERROR,
  PASSWORD_RESET_ERROR,
  PASSWORD_VALIDATION_ERROR,
  TOKEN_STATE,
} from "./data/constants";
import { resetPasswordResultSelector } from "./data/selectors";
import { validatePassword } from "./data/service";
import messages from "./messages";
import ResetPasswordFailure from "./ResetPasswordFailure";
import BaseContainer from "../base-container";
import { PasswordField } from "../common-components";
import { LOGIN_PAGE, RESET_PAGE, SAMPLE_PASSWORDS } from "../data/constants";
import {
  getAllPossibleQueryParams,
  updatePathWithQueryParams,
  windowScrollTo,
} from "../data/utils";
import { checkPassword, PasswordRequirements } from "./PasswordRequirements";
// import PasswordChecklist from "react-password-checklist";

const ResetPasswordPage = (props) => {
  const { formatMessage } = useIntl();
  const newPasswordError = formatMessage(
    messages["password.validation.message"],
  );
  const [newPassword, setNewPassword] = useState("");
  const isSamplePassword = SAMPLE_PASSWORDS.includes(newPassword);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [errorCode, setErrorCode] = useState(null);
  const [passwordValidationError, setPasswordValidationError] = useState(null);
  const [prevPasswordOnSubmit, setPrevPasswordOnSubmit] = useState("");
  const [prevConfirmPasswordOnSubmit, setPrevConfirmPasswordOnSubmit] =
    useState("");
  const { token } = useParams();
  const navigate = useNavigate();
  const userDetails = props.tokenValidationResponse;
  const personalInfo = userDetails
    ? `${userDetails?.full_name} ${userDetails?.username}`
    : "";
  const passwordRequirements = checkPassword(
    newPassword,
    confirmPassword,
    personalInfo,
  );
  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);
  const isSubmitDisabled =
    !isPasswordValid ||
    !Object.values(passwordRequirements).every(Boolean) ||
    isSamplePassword ||
    Boolean(passwordValidationError);

  useEffect(() => {
    if (
      props.status !== TOKEN_STATE.PENDING &&
      props.status !== PASSWORD_RESET_ERROR
    ) {
      setErrorCode(props.status);
    }
    if (props.status === PASSWORD_VALIDATION_ERROR) {
      setFormErrors({ newPassword: newPasswordError });
    }
  }, [props.status, newPasswordError]);

  useEffect(() => {
    if (!newPassword || !isPasswordValid) {
      setErrorCode(null);
      setPasswordValidationError(null);
      return undefined;
    }

    let isCurrentRequest = true;
    const timeoutId = setTimeout(async () => {
      try {
        const errorMessage = await validatePassword({
          reset_password_page: true,
          password: newPassword,
        });
        if (isCurrentRequest) {
          setPasswordValidationError(errorMessage || null);
          setErrorCode(errorMessage ? PASSWORD_VALIDATION_ERROR : null);
        }
      } catch (err) {
        if (isCurrentRequest) {
          setPasswordValidationError(null);
          setErrorCode(null);
        }
      }
    }, 500);

    return () => {
      isCurrentRequest = false;
      clearTimeout(timeoutId);
    };
  }, [newPassword, isPasswordValid]);

  const validateInput = (name, value) => {
    const trimmedValue = value.trim();
    switch (name) {
      case "newPassword":
        if (!trimmedValue) {
          formErrors.newPassword = formatMessage(
            messages["password.required.mesaage"],
          );
        } else if (!isPasswordValid) {
          formErrors.newPassword = formatMessage(
            messages["password.validation.message"],
          );
        } else {
          formErrors.newPassword = "";
        }
        break;
      case "confirmPassword":
        if (!trimmedValue) {
          formErrors.confirmPassword = formatMessage(
            messages["confirm.your.password"],
          );
        } else if (trimmedValue !== newPassword) {
          formErrors.confirmPassword = formatMessage(
            messages["passwords.do.not.match"],
          );
        } else {
          formErrors.confirmPassword = "";
        }
        break;
      default:
        break;
    }
    setFormErrors({ ...formErrors });
    return !Object.values(formErrors).some((x) => x !== "");
  };

  const handleOnBlur = (event) => {
    const { name, value } = event.target;
  };

  const handleConfirmPasswordChange = (e) => {
    const { value } = e.target;

    setConfirmPassword(value);
  };

  const handleOnFocus = (e) => {
    setFormErrors({ ...formErrors, [e.target.name]: "" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Skip re-validation if the values haven't changed
    if (
      formErrors.newPassword &&
      newPassword === prevPasswordOnSubmit &&
      confirmPassword === prevConfirmPasswordOnSubmit
    ) {
      return;
    }

    // Update the previous values
    setPrevPasswordOnSubmit(newPassword);
    setPrevConfirmPasswordOnSubmit(confirmPassword);

    const isPasswordValid = validateInput("newPassword", newPassword);
    const isPasswordConfirmed = validateInput(
      "confirmPassword",
      confirmPassword,
    );

    if (isPasswordValid && isPasswordConfirmed && !passwordValidationError) {
      const formPayload = {
        new_password1: newPassword,
        new_password2: confirmPassword,
      };
      const params = getAllPossibleQueryParams();
      props.resetPassword(formPayload, props.token, params);
    } else {
      setErrorCode(FORM_SUBMISSION_ERROR);
      windowScrollTo({ left: 0, top: 0, behavior: "smooth" });
    }
  };

  const tabTitle = (
    <div className="d-inline-flex flex-wrap align-items-center">
      <Icon src={ChevronLeft} />
      <span className="ml-2">{formatMessage(messages["sign.in"])}</span>
    </div>
  );

  if (props.status === TOKEN_STATE.PENDING) {
    if (token) {
      props.validateToken(token);
      return (
        <Spinner
          animation="border"
          variant="primary"
          className="spinner--position-centered"
        />
      );
    }
  } else if (props.status === PASSWORD_RESET_ERROR) {
    navigate(updatePathWithQueryParams(RESET_PAGE));
  } else if (props.status === "success") {
    navigate(updatePathWithQueryParams(LOGIN_PAGE));
  } else {
    return (
      <BaseContainer>
        <div>
          <Helmet>
            <title>
              {formatMessage(messages["reset.password.page.title"], {
                siteName: getConfig().SITE_NAME,
              })}
            </title>
          </Helmet>
          <Tabs
            activeKey=""
            id="controlled-tab"
            onSelect={(key) => navigate(updatePathWithQueryParams(key))}
          >
            <Tab title={tabTitle} eventKey={LOGIN_PAGE} />
          </Tabs>
          <div id="main-content" className="main-content">
            <div className="mw-xs">
              <ResetPasswordFailure
                errorCode={errorCode}
                errorMsg={passwordValidationError || props.errorMsg}
              />
              <h4>{formatMessage(messages["reset.password"])}</h4>
              <p className="mb-4">
                {formatMessage(messages["reset.password.page.instructions"])}
              </p>
              <Form id="set-reset-password-form" name="set-reset-password-form">
                <PasswordField
                  name="newPassword"
                  value={newPassword}
                  handleChange={(e) => {
                    setNewPassword(e.target.value);
                    setErrorCode(null);
                    setPasswordValidationError(null);
                  }}
                  handleBlur={handleOnBlur}
                  handleFocus={handleOnFocus}
                  errorMessage={formErrors.newPassword}
                  floatingLabel={formatMessage(messages["new.password.label"])}
                />
                <PasswordField
                  name="confirmPassword"
                  value={confirmPassword}
                  handleChange={handleConfirmPasswordChange}
                  handleFocus={handleOnFocus}
                  errorMessage={formErrors.confirmPassword}
                  showRequirements={false}
                  floatingLabel={formatMessage(
                    messages["confirm.password.label"],
                  )}
                />
                <StatefulButton
                  id="submit-new-password"
                  name="submit-new-password"
                  type="submit"
                  disabled={isSubmitDisabled}
                  variant="brand"
                  className="reset-password--button"
                  state={props.status}
                  labels={{
                    default: formatMessage(messages["reset.password"]),
                    pending: "",
                  }}
                  onClick={(e) => handleSubmit(e)}
                  onMouseDown={(e) => e.preventDefault()}
                />
                <p
                  className="password-requirements mt-1 mb-0 p-0 text-muted"
                  style={{ fontSize: "0.875rem" }}
                >
                  <strong>Password Requirements:</strong>
                </p>
                <PasswordRequirements
                  password={newPassword}
                  personalInfo={
                    userDetails
                      ? `${userDetails?.full_name} ${userDetails?.username}`
                      : ""
                  }
                  confirmPassword={confirmPassword}
                />
                {isSamplePassword && (
                  <p
                    id="sample-password-error"
                    role="alert"
                    style={{
                      color: "#dc3545",
                      fontSize: "14px",
                      fontStyle: "italic",
                    }}
                  >
                    The sample passwords provided are for reference only and
                    cannot be used. Please choose a unique password.
                  </p>
                )}
              </Form>
            </div>
          </div>
        </div>
      </BaseContainer>
    );
  }
  return null;
};

ResetPasswordPage.defaultProps = {
  status: null,
  token: null,
  tokenValidationResponse: null,
  errorMsg: null,
};

ResetPasswordPage.propTypes = {
  resetPassword: PropTypes.func.isRequired,
  validateToken: PropTypes.func.isRequired,
  token: PropTypes.string,
  tokenValidationResponse: PropTypes.object,
  status: PropTypes.string,
  errorMsg: PropTypes.string,
};

export default connect(resetPasswordResultSelector, {
  resetPassword,
  validateToken,
})(ResetPasswordPage);
