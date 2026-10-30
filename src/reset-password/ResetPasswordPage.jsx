import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';

import { getConfig } from '@edx/frontend-platform';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Form,
  Icon,
  Spinner,
  StatefulButton,
  Tab,
  Tabs,
} from '@openedx/paragon';
import { ChevronLeft } from '@openedx/paragon/icons';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';

import { resetPassword, validateToken } from './data/actions';
import {
  FORM_SUBMISSION_ERROR, PASSWORD_RESET_ERROR, PASSWORD_VALIDATION_ERROR, TOKEN_STATE,
} from './data/constants';
import { resetPasswordResultSelector } from './data/selectors';
import { validatePassword } from './data/service';
import messages from './messages';
import ResetPasswordFailure from './ResetPasswordFailure';
import BaseContainer from '../base-container';
import { PasswordField } from '../common-components';
import {
  LETTER_REGEX, LOGIN_PAGE, NUMBER_REGEX, RESET_PAGE,
} from '../data/constants';
import { getAllPossibleQueryParams, updatePathWithQueryParams, windowScrollTo } from '../data/utils';
import PasswordChecklist from 'react-password-checklist';


const ResetPasswordPage = (props) => {
  const { formatMessage } = useIntl();
  const newPasswordError = formatMessage(messages['password.validation.message']);

  const [newPassword, setNewPassword] = useState('');
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [errorCode, setErrorCode] = useState(null);
  const [prevPasswordOnSubmit, setPrevPasswordOnSubmit] = useState('');
  const [prevConfirmPasswordOnSubmit, setPrevConfirmPasswordOnSubmit] = useState('');
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (props.status !== TOKEN_STATE.PENDING && props.status !== PASSWORD_RESET_ERROR) {
      setErrorCode(props.status);
    }
    if (props.status === PASSWORD_VALIDATION_ERROR) {
      setFormErrors({ newPassword: newPasswordError });
    }
  }, [props.status, newPasswordError]);

  const validatePasswordFromBackend = async (password) => {
    let errorMessage = '';
    try {
      const payload = {
        reset_password_page: true,
        password,
      };
      errorMessage = await validatePassword(payload);
    } catch (err) {
      errorMessage = '';
    }
    setFormErrors({ ...formErrors, newPassword: errorMessage });
  };

  const validateInput = (name, value) => {
    const trimmedValue = value.trim();
    switch (name) {
      case 'newPassword':
        if(!trimmedValue) {
          formErrors.newPassword = formatMessage(messages['password.required.mesaage']);
        }
        else if (!isPasswordValid) {
          formErrors.newPassword = formatMessage(messages['password.validation.message']);
        } else {
          validatePasswordFromBackend(value);
        }
        break;
      case 'confirmPassword':
        if (!trimmedValue) {
          formErrors.confirmPassword = formatMessage(messages['confirm.your.password']);
        } else if (trimmedValue !== newPassword) {
          formErrors.confirmPassword = formatMessage(messages['passwords.do.not.match']);
        } else {
          formErrors.confirmPassword = '';
        }
        break;
      default:
        break;
    }
    setFormErrors({ ...formErrors });
    return !Object.values(formErrors).some(x => (x !== ''));
  };

  const handleOnBlur = (event) => {
    const { name, value } = event.target;
  };

  const handleConfirmPasswordChange = (e) => {
    const { value } = e.target;

    setConfirmPassword(value);
  };

  const handleOnFocus = (e) => {
    setFormErrors({ ...formErrors, [e.target.name]: '' });
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
    
    const isPasswordValid = validateInput('newPassword', newPassword);
    const isPasswordConfirmed = validateInput('confirmPassword', confirmPassword);

    if (isPasswordValid && isPasswordConfirmed) {
      const formPayload = {
        new_password1: newPassword,
        new_password2: confirmPassword,
      };
      const params = getAllPossibleQueryParams();
      props.resetPassword(formPayload, props.token, params);
    } else {
      setErrorCode(FORM_SUBMISSION_ERROR);
      windowScrollTo({ left: 0, top: 0, behavior: 'smooth' });
    }
  };

  const tabTitle = (
    <div className="d-inline-flex flex-wrap align-items-center">
      <Icon src={ChevronLeft} />
      <span className="ml-2">{formatMessage(messages['sign.in'])}</span>
    </div>
  );

  if (props.status === TOKEN_STATE.PENDING) {
    if (token) {
      props.validateToken(token);
      return <Spinner animation="border" variant="primary" className="spinner--position-centered" />;
    }
  } else if (props.status === PASSWORD_RESET_ERROR) {
    navigate(updatePathWithQueryParams(RESET_PAGE));
  } else if (props.status === 'success') {
    navigate(updatePathWithQueryParams(LOGIN_PAGE));
  } else {
    return (
      <BaseContainer>
        <div>
          <Helmet>
            <title>
              {formatMessage(messages['reset.password.page.title'], { siteName: getConfig().SITE_NAME })}
            </title>
          </Helmet>
          <Tabs activeKey="" id="controlled-tab" onSelect={(key) => navigate(updatePathWithQueryParams(key))}>
            <Tab title={tabTitle} eventKey={LOGIN_PAGE} />
          </Tabs>
          <div id="main-content" className="main-content">
            <div className="mw-xs">
              <ResetPasswordFailure errorCode={errorCode} errorMsg={props.errorMsg} />
              <h4>{formatMessage(messages['reset.password'])}</h4>
              <p className="mb-4">{formatMessage(messages['reset.password.page.instructions'])}</p>
              <Form id="set-reset-password-form" name="set-reset-password-form">
                <PasswordField
                  name="newPassword"
                  value={newPassword}
                  handleChange={(e) => setNewPassword(e.target.value)}
                  handleBlur={handleOnBlur}
                  handleFocus={handleOnFocus}
                  errorMessage={formErrors.newPassword}
                  floatingLabel={formatMessage(messages['new.password.label'])}
                />
                <PasswordField
                  name="confirmPassword"
                  value={confirmPassword}
                  handleChange={handleConfirmPasswordChange}
                  handleFocus={handleOnFocus}
                  errorMessage={formErrors.confirmPassword}
                  showRequirements={false}
                  floatingLabel={formatMessage(messages['confirm.password.label'])}
                />          
                <PasswordChecklist
                  rules={[
                    "notEmpty",
                    "match",
                  ]}
                  minLength={8}
                  value={newPassword}
                  valueAgain={confirmPassword}
                  messages={{
                    notEmpty: "Password cannot be empty",
                    match: "Passwords must match",
                  }}
                  onChange={(isValid) => setIsPasswordValid(isValid)}
                />
                <StatefulButton
                  id="submit-new-password"
                  name="submit-new-password"
                  type="submit"
                  variant="brand"
                  className="reset-password--button"
                  state={props.status}
                  labels={{
                    default: formatMessage(messages['reset.password']),
                    pending: '',
                  }}
                  onClick={e => handleSubmit(e)}
                  onMouseDown={(e) => e.preventDefault()}
                />
                <p className="password-requirements mt-3 mb-0 p-0 text-muted" style={{ fontSize: '0.875rem' }}>
                  <strong>Password Requirements:</strong>
                </p>
                <ul className="password-requirements text-muted" style={{ fontSize: '0.875rem' }}>
                    <li>Should contain at least three of the four categories: lowercase, uppercase, numeric, and special characters.</li>
                    <li>Your password must contain at least 4 unique characters.</li>
                    <li>Must not contain common dictionary words.</li>
                    <li>Must not contain personal info.</li>
                    <li>Must not contain any character more than 4 times.</li>
                    <li>Must not include keyboard patterns of more than three (3) characters.</li>
                </ul>
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
  errorMsg: null,
};

ResetPasswordPage.propTypes = {
  resetPassword: PropTypes.func.isRequired,
  validateToken: PropTypes.func.isRequired,
  token: PropTypes.string,
  status: PropTypes.string,
  errorMsg: PropTypes.string,
};

export default connect(
  resetPasswordResultSelector,
  {
    resetPassword,
    validateToken,
  },
)(ResetPasswordPage);
