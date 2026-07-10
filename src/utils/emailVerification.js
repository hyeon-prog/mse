import { isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink, signOut } from 'firebase/auth'
import { auth } from '../firebase.js'
import { resolveUniversityByEmailDomain } from './universityLogos.js'
import { leaveUniversity, setSelectedUniversity } from './university.js'

// 로그인 링크를 보낸 이메일을 기억해뒀다가, 링크를 눌러 돌아왔을 때 다시 물어보지
// 않고 바로 인증을 완료하는 데 쓴다(다른 기기/브라우저에서 링크를 열면 없을 수 있으니
// 그 경우에만 이메일을 다시 물어본다).
const PENDING_EMAIL_KEY = 'mse-pending-verification-email'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function actionCodeSettings() {
  // BASE_URL은 로컬(/)과 배포(/mse/) 양쪽에서 항상 올바른 절대 경로를 만들어준다.
  return {
    url: `${window.location.origin}${import.meta.env.BASE_URL}`,
    handleCodeInApp: true,
  }
}

export function isValidEmail(email) {
  return EMAIL_PATTERN.test(email.trim())
}

// Firebase Auth의 원문 에러 코드를 사용자가 이해할 수 있는 한국어 메시지로 바꾼다.
function describeAuthError(error) {
  switch (error?.code) {
    case 'auth/configuration-not-found':
    case 'auth/operation-not-allowed':
      // Firebase 콘솔에서 Authentication의 이메일 링크 로그인이 아직 켜지지 않은 상태.
      return '학교 이메일 인증 기능이 아직 준비되지 않았어요. 잠시 후 다시 시도해주세요.'
    case 'auth/invalid-email':
      return '올바른 이메일 주소를 입력해주세요.'
    case 'auth/too-many-requests':
      return '요청이 너무 많아요. 잠시 후 다시 시도해주세요.'
    case 'auth/network-request-failed':
      return '네트워크 연결을 확인해주세요.'
    default:
      return '인증 메일을 보내지 못했어요. 잠시 후 다시 시도해주세요.'
  }
}

export async function sendVerificationEmail(email) {
  const trimmed = email.trim()
  if (!isValidEmail(trimmed)) {
    throw new Error('올바른 이메일 주소를 입력해주세요.')
  }
  try {
    await sendSignInLinkToEmail(auth, trimmed, actionCodeSettings())
  } catch (error) {
    console.error('failed to send verification email', error)
    throw new Error(describeAuthError(error))
  }
  window.localStorage.setItem(PENDING_EMAIL_KEY, trimmed)
}

/**
 * 앱이 로드될 때 한 번 호출한다. 현재 URL이 이메일 인증 링크면 로그인을 완료하고
 * 학교 이메일 도메인으로 학교를 자동 배정한 뒤, 결과를 반환한다.
 * 인증 링크가 아니면 null을 반환한다(아무 것도 하지 않음).
 */
export async function completeEmailLinkSignIn() {
  const url = window.location.href
  if (!isSignInWithEmailLink(auth, url)) return null

  let email = window.localStorage.getItem(PENDING_EMAIL_KEY)
  if (!email) {
    // 링크를 보낸 기기/브라우저가 아니면(예: 다른 폰의 메일 앱) 기억해둔 이메일이 없으니
    // 직접 입력받는다. 취소하면 인증을 진행하지 않는다.
    email = window.prompt('인증에 사용한 학교 이메일 주소를 다시 입력해주세요.')
  }

  // 링크는 1회용이라, 결과와 상관없이 같은 URL로 새로고침해도 다시 시도하지 않도록
  // 쿼리 파라미터를 즉시 지운다.
  const cleanUrl = window.location.pathname + window.location.hash
  window.history.replaceState({}, document.title, cleanUrl)

  if (!email) {
    return { status: 'cancelled' }
  }

  try {
    const credential = await signInWithEmailLink(auth, email, url)
    window.localStorage.removeItem(PENDING_EMAIL_KEY)
    const verifiedEmail = credential.user.email
    const university = resolveUniversityByEmailDomain(verifiedEmail)
    if (university) {
      setSelectedUniversity(university, true)
      return { status: 'verified', email: verifiedEmail, university }
    }
    return { status: 'unknown-domain', email: verifiedEmail }
  } catch (error) {
    console.error('email link sign-in failed', error)
    return { status: 'error', error }
  }
}

export function getVerifiedEmail() {
  return auth.currentUser?.email ?? null
}

export async function signOutVerification() {
  await signOut(auth)
  leaveUniversity()
}
