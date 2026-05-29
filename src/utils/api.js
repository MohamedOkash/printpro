const generateFallbackResponse = (prompt) => {
  const subjectMatch = prompt.match(/المادة:\s*([^,]+)/);
  const gradeMatch = prompt.match(/الصف:\s*([^,]+)/);
  const teacherMatch = prompt.match(/المعلم:\s*([^.]+)/);

  const subject = subjectMatch ? subjectMatch[1].trim() : 'المادة';
  const grade = gradeMatch ? gradeMatch[1].trim() : '';
  const teacher = teacherMatch ? teacherMatch[1].trim() : '';

  const subjectTitles = {
    'الرياضيات': ['سلسلة المتميز في الرياضيات', 'البروفيسور في الرياضيات', 'الرياضيات الذهبية'],
    'الفيزياء': ['العبقري في الفيزياء', 'سلسلة تبسيط الفيزياء', 'الفيزياء في ثوبها الجديد'],
    'الكيمياء': ['الرازي في الكيمياء', 'سلسلة التفوق الكيميائي', 'كيمياء الثانوية العامة'],
    'الأحياء': ['الطبيب في الأحياء', 'ابن النفيس في الأحياء', 'سلسلة الحياة في الأحياء'],
    'الجيولوجيا': ['الصخرة في الجيولوجيا', 'سلسلة التفوق الجيولوجي', 'المرشد في الجيولوجيا'],
    'العلوم': ['المستكشف في العلوم', 'سلسلة الإبداع العلمي', 'التميز في العلوم'],
    'اللغة العربية': ['الضاد في اللغة العربية', 'الفاروق في اللغة العربية', 'المرشد اللغوي'],
    'اللغة الإنجليزية': ['The Legend in English', 'First Class English', 'English Zone'],
    'اللغة الفرنسية': ['Le Chef en Français', 'سلسلة الفرنسية المبسطة', 'التميز في الفرنسية'],
    'التاريخ': ['المؤرخ في التاريخ', 'سلسلة عباقرة التاريخ', 'بوابة التاريخ'],
    'الجغرافيا': ['سلسلة الجغرافي المحترف', 'الأطلس في الجغرافيا', 'الجغرافيا المبسطة'],
    'الفلسفة': ['الفيلسوف في المواد الفلسفية', 'سلسلة التفكير المنطقي'],
    'علم النفس': ['سلسلة أسرار النفس', 'الموجز في علم النفس'],
    'الحاسب الآلي': ['المبرمج في الحاسب الآلي', 'سلسلة التكنولوجيا الحديثة'],
    'الدراسات': ['الأستاذ في الدراسات الاجتماعية', 'سلسلة الجغرافي والمؤرخ']
  };

  let titleList = [`سلسلة التميز والنجاح في ${subject}`, `مذكرة الدرجة النهائية في ${subject}`, `دليل الطالب الذكي في ${subject}`];
  for (const [key, list] of Object.entries(subjectTitles)) {
    if (subject.includes(key) || key.includes(subject)) {
      titleList = list;
      break;
    }
  }

  const randomTitle = titleList[Math.floor(Math.random() * titleList.length)];
  return {
    title: randomTitle,
    subtitle: grade && grade !== 'غير محدد' ? `${grade} - الفصل الدراسي الأول` : 'منهج العام الدراسي الجديد',
    author: teacher && teacher !== 'غير محدد' 
      ? (teacher.startsWith('إعداد') ? teacher : `إعداد الأستاذ: ${teacher}`)
      : 'إعداد نخبة من المعلمين'
  };
};

/**
 * Call Claude claude-sonnet-4-20250514 and expect a JSON response.
 * ⚠️  The API key is handled by the Anthropic proxy — do NOT add one here.
 */
export const callClaudeAPI = async (prompt) => {
  try {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data  = await res.json()
    const text  = data?.content?.map(b => b.text || '').join('') || ''
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch (err) {
    console.warn('Claude API call failed (likely CORS or missing API proxy). Using offline heuristic fallback...', err)
    return generateFallbackResponse(prompt)
  }
}

