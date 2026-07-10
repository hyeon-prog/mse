// 서울 소재 대학 이름 → 공식 도메인 매핑. 랭킹 화면에서 학교 이름 앞에
// 로고를 붙이기 위해 쓴다(도메인을 알아야 로고 API에 물어볼 수 있어서).
// 방(university room) 이름은 자유 입력이라 이 표에 없는 학교는 로고 없이
// 이름만 표시된다.
const SEOUL_UNIVERSITY_DOMAINS = {
  서울대학교: 'snu.ac.kr',
  서울대: 'snu.ac.kr',
  연세대학교: 'yonsei.ac.kr',
  연세대: 'yonsei.ac.kr',
  고려대학교: 'korea.ac.kr',
  고려대: 'korea.ac.kr',
  서강대학교: 'sogang.ac.kr',
  서강대: 'sogang.ac.kr',
  성균관대학교: 'skku.edu',
  성균관대: 'skku.edu',
  한양대학교: 'hanyang.ac.kr',
  한양대: 'hanyang.ac.kr',
  중앙대학교: 'cau.ac.kr',
  중앙대: 'cau.ac.kr',
  경희대학교: 'khu.ac.kr',
  경희대: 'khu.ac.kr',
  한국외국어대학교: 'hufs.ac.kr',
  한국외대: 'hufs.ac.kr',
  외대: 'hufs.ac.kr',
  서울시립대학교: 'uos.ac.kr',
  시립대: 'uos.ac.kr',
  건국대학교: 'konkuk.ac.kr',
  건국대: 'konkuk.ac.kr',
  동국대학교: 'dongguk.edu',
  동국대: 'dongguk.edu',
  홍익대학교: 'hongik.ac.kr',
  홍익대: 'hongik.ac.kr',
  홍대: 'hongik.ac.kr',
  숙명여자대학교: 'sookmyung.ac.kr',
  숙명여대: 'sookmyung.ac.kr',
  이화여자대학교: 'ewha.ac.kr',
  이화여대: 'ewha.ac.kr',
  이대: 'ewha.ac.kr',
  국민대학교: 'kookmin.ac.kr',
  국민대: 'kookmin.ac.kr',
  숭실대학교: 'ssu.ac.kr',
  숭실대: 'ssu.ac.kr',
  세종대학교: 'sejong.ac.kr',
  세종대: 'sejong.ac.kr',
  광운대학교: 'kw.ac.kr',
  광운대: 'kw.ac.kr',
  상명대학교: 'smu.ac.kr',
  상명대: 'smu.ac.kr',
  서울여자대학교: 'swu.ac.kr',
  서울여대: 'swu.ac.kr',
  덕성여자대학교: 'duksung.ac.kr',
  덕성여대: 'duksung.ac.kr',
  동덕여자대학교: 'dongduk.ac.kr',
  동덕여대: 'dongduk.ac.kr',
  성신여자대학교: 'sungshin.ac.kr',
  성신여대: 'sungshin.ac.kr',
  가톨릭대학교: 'catholic.ac.kr',
  가톨릭대: 'catholic.ac.kr',
  서울과학기술대학교: 'seoultech.ac.kr',
  서울과기대: 'seoultech.ac.kr',
  명지대학교: 'mju.ac.kr',
  명지대: 'mju.ac.kr',
  한성대학교: 'hansung.ac.kr',
  한성대: 'hansung.ac.kr',
  삼육대학교: 'syu.ac.kr',
  삼육대: 'syu.ac.kr',
  서경대학교: 'skuniv.ac.kr',
  서경대: 'skuniv.ac.kr',
  추계예술대학교: 'chugye.ac.kr',
  추계예대: 'chugye.ac.kr',
  서울교육대학교: 'snue.ac.kr',
  서울교대: 'snue.ac.kr',
  한국예술종합학교: 'karts.ac.kr',
  한예종: 'karts.ac.kr',
  한국체육대학교: 'knsu.ac.kr',
  한체대: 'knsu.ac.kr',
  육군사관학교: 'kma.ac.kr',
  육사: 'kma.ac.kr',
  총신대학교: 'chongshin.ac.kr',
  총신대: 'chongshin.ac.kr',
  성공회대학교: 'skhu.ac.kr',
  성공회대: 'skhu.ac.kr',
  감리교신학대학교: 'mtu.ac.kr',
  감신대: 'mtu.ac.kr',
  장로회신학대학교: 'puts.ac.kr',
  장신대: 'puts.ac.kr',
}

export function getUniversityDomain(name) {
  if (!name) return null
  return SEOUL_UNIVERSITY_DOMAINS[name.trim()] ?? null
}

export function hasKnownLogo(name) {
  return getUniversityDomain(name) !== null
}

// 이메일 인증(emailVerification.js)에서 "학교 이메일 도메인 → 학교 이름"으로
// 거꾸로 찾을 때 쓴다. 위 표는 학교 하나에 정식 명칭/약칭 등 여러 키가 같은
// 도메인을 가리키므로, 도메인마다 가장 긴(=가장 정식에 가까운) 이름을 고른다.
let domainToNameCache = null

function buildDomainToNameMap() {
  const map = {}
  for (const [name, domain] of Object.entries(SEOUL_UNIVERSITY_DOMAINS)) {
    const current = map[domain]
    if (!current || name.length > current.length) {
      map[domain] = name
    }
  }
  return map
}

/** 이메일 도메인이 등록된 학교 도메인과 일치하면 그 학교의 정식 명칭을, 아니면 null을 돌려준다. */
export function resolveUniversityByEmailDomain(email) {
  const domain = email?.trim().toLowerCase().split('@')[1]
  if (!domain) return null
  domainToNameCache ??= buildDomainToNameMap()
  return domainToNameCache[domain] ?? null
}
