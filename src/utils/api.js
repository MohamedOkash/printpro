const generateFallbackResponse = (prompt) => {
  const subjectMatch = prompt.match(/(?:المادة|Subject):\s*([^,\n]+)/i)
  const gradeMatch   = prompt.match(/(?:الصف|Grade):\s*([^,\n]+)/i)
  const teacherMatch = prompt.match(/(?:المعلم|Teacher):\s*([^.\n]+)/i)

  const isEnglish = !/[\u0600-\u06FF]/.test(prompt)

  const subject = subjectMatch ? subjectMatch[1].trim() : (isEnglish ? 'Subject' : 'المادة')
  const grade   = gradeMatch   ? gradeMatch[1].trim()   : ''
  const teacher = teacherMatch ? teacherMatch[1].trim() : ''

  if (isEnglish) {
    const subjectTitles = {
      'math':         ['Advanced Mathematics Series', 'The Math Professor Guide', 'Golden Math Book'],
      'physics':      ['Genius in Physics', 'Physics Made Simple', 'Modern Physics Guide'],
      'chemistry':    ['Al-Razi in Chemistry', 'Chemistry Excellence Series', 'High School Chemistry'],
      'biology':      ['The Doctor in Biology', 'Life Science Series', 'Biology Essentials'],
      'arabic':       ['Al-Dad in Arabic Language', 'The Arabic Masterclass', 'Arabic Language Guide'],
      'english':      ['The Legend in English', 'First Class English', 'English Zone'],
      'history':      ['The Historian Chronicles', 'Genius of History Series', 'Gateway to History'],
      'geography':    ['Professional Geographer Series', 'Atlas Geography Guide', 'Simplified Geography'],
    }

    let titleList = [
      `Excellence and Success in ${subject}`,
      `Final Revision Notebook in ${subject}`,
      `Smart Student Guide in ${subject}`,
    ]
    for (const [key, list] of Object.entries(subjectTitles)) {
      if (subject.toLowerCase().includes(key) || key.includes(subject.toLowerCase())) {
        titleList = list
        break
      }
    }

    return {
      title:    titleList[Math.floor(Math.random() * titleList.length)],
      subtitle: grade && grade !== 'unspecified' && grade !== 'غير محدد'
        ? `${grade} - First Semester`
        : 'New Academic Year Curriculum',
      author: teacher && teacher !== 'unspecified' && teacher !== 'غير محدد'
        ? (teacher.toLowerCase().startsWith('prepared') ? teacher : `Prepared by: ${teacher}`)
        : 'Prepared by elite educators',
    }
  }

  const subjectTitles = {
    'الرياضيات':         ['سلسلة المتميز في الرياضيات',  'البروفيسور في الرياضيات',   'الرياضيات الذهبية'],
    'الفيزياء':          ['العبقري في الفيزياء',          'سلسلة تبسيط الفيزياء',      'الفيزياء في ثوبها الجديد'],
    'الكيمياء':          ['الرازي في الكيمياء',           'سلسلة التفوق الكيميائي',     'كيمياء الثانوية العامة'],
    'الأحياء':           ['الطبيب في الأحياء',            'ابن النفيس في الأحياء',      'سلسلة الحياة في الأحياء'],
    'اللغة العربية':     ['الضاد في اللغة العربية',       'الفاروق في اللغة العربية',   'المرشد اللغوي'],
    'اللغة الإنجليزية': ['The Legend in English',         'First Class English',        'English Zone'],
    'التاريخ':           ['المؤرخ في التاريخ',            'سلسلة عباقرة التاريخ',       'بوابة التاريخ'],
    'الجغرافيا':         ['سلسلة الجغرافي المحترف',       'الأطلس في الجغرافيا',        'الجغرافيا المبسطة'],
  }

  let titleList = [
    `سلسلة التميز والنجاح في ${subject}`,
    `مذكرة الدرجة النهائية في ${subject}`,
    `دليل الطالب الذكي في ${subject}`,
  ]
  for (const [key, list] of Object.entries(subjectTitles)) {
    if (subject.includes(key) || key.includes(subject)) {
      titleList = list
      break
    }
  }

  return {
    title:    titleList[Math.floor(Math.random() * titleList.length)],
    subtitle: grade && grade !== 'غير محدد'
      ? `${grade} - الفصل الدراسي الأول`
      : 'منهج العام الدراسي الجديد',
    author: teacher && teacher !== 'غير محدد'
      ? (teacher.startsWith('إعداد') ? teacher : `إعداد الأستاذ: ${teacher}`)
      : 'إعداد نخبة من المعلمين',
  }
}

export const callClaudeAPI = async (prompt) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    console.warn('VITE_GEMINI_API_KEY is not defined, using offline fallback.')
    return generateFallbackResponse(prompt)
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      }),
    })

    if (!res.ok) throw new Error(`Gemini API returned ${res.status}`)

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    // [تم الإصلاح]: إزالة علامات Markdown العشوائية لضمان نجاح التحويل
    const cleanedText = text.replace(/```json/gi, '').replace(/```/g, '').trim()
    return JSON.parse(cleanedText)

  } catch (err) {
    console.warn('Gemini API call failed, using offline fallback:', err)
    return generateFallbackResponse(prompt)
  }
}