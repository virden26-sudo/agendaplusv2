/** Offline diagnostics use reviewed questions matched to imported topics, or facts quoted from notes. */
export type StudySource = { id: string; title: string; course: string; details?: string; kind: string };
export type PracticeQuestion = {
  id: string; topic: string; prompt: string; choices: string[]; answer: number;
  explanation: string; sourceId: string; sourceTitle: string;
};
export type Mastery = Record<string, { correct: number; attempts: number }>;
const lessons = [
  { topic: 'Java classes and objects', match: /\b(oop|objects?|class(?:es)?|encapsulation)\b/i,
    prompt: 'A Java class is a blueprint. What is an object?', choices: ['An instance of a class', 'A compiler error', 'A primitive type', 'A package declaration'],
    explanation: 'A class defines fields and methods. An object is an instance with its own state. For example, Car car = new Car() creates a Car object.' },
  { topic: 'Java inheritance', match: /\b(inheritance|extends|superclass|subclass)\b/i,
    prompt: 'Which Java keyword declares that one class inherits from another?', choices: ['extends', 'implementsOnly', 'import', 'instanceof'],
    explanation: 'class Dog extends Animal makes Dog a subclass of Animal. Inheritance models an is-a relationship; inherited accessible behavior can be reused or overridden.' },
  { topic: 'Java loops', match: /\b(loop|loops|iteration|while|for loop)\b/i,
    prompt: 'How many times does this loop execute? for (int i = 0; i < 3; i++) { System.out.println(i); }', choices: ['3', '2', '4', '0'],
    explanation: 'Trace i: 0, 1, and 2 pass i < 3. After the third increment i is 3, so the condition is false. The body executes three times.' },
  { topic: 'Java methods', match: /\b(method|methods|parameter|return value)\b/i,
    prompt: 'What does the return type void mean in a Java method declaration?', choices: ['The method returns no value', 'The method cannot have parameters', 'The method runs only once', 'The method returns null'],
    explanation: 'void means there is no returned value. A void method may accept parameters and perform work. A method returning int must return an integer on every normal completion path.' },
  { topic: 'Java arrays', match: /\b(array|arrays|index|indices)\b/i,
    prompt: 'For int[] values = {10, 20, 30}, what is values[1]?', choices: ['20', '10', '30', 'An out-of-bounds error'],
    explanation: 'Java arrays use zero-based indexes: values[0] is 10, values[1] is 20, and values[2] is 30. The last valid index is length - 1.' },
  { topic: 'Java input', match: /\b(scanner|nextInt|nextDouble|input validation)\b/i,
    prompt: 'Before calling Scanner.nextInt(), which method checks whether the next token is an integer?', choices: ['hasNextInt()', 'isInteger()', 'nextLine()', 'close()'],
    explanation: 'hasNextInt() checks the next token without consuming it. nextInt() consumes it. Checking first lets you handle invalid input instead of throwing InputMismatchException.' },
  { topic: 'Java strings', match: /\b(string|strings|equals)\b/i,
    prompt: 'Which expression compares the contents of two non-null Java strings a and b?', choices: ['a.equals(b)', 'a == b', 'a = b', 'a.compare(b)'],
    explanation: 'equals compares String contents. == compares object references. Use Objects.equals(a, b) if either reference may be null.' },
];

export function buildDiagnostic(sources: StudySource[], mastery: Mastery = {}): PracticeQuestion[] {
  const questions: PracticeQuestion[] = [];
  for (const lesson of lessons) {
    const source = sources.find(s => /java|CSC[\s-]*262/i.test(s.course + ' ' + s.title + ' ' + s.details) && lesson.match.test(s.title + ' ' + (s.details || '')));
    if (source) questions.push({ ...lesson, id: `${source.id}:${lesson.topic}`, answer: 0, sourceId: source.id, sourceTitle: source.title });
  }
  // Generic subjects need actual explanatory material, not invented answers inferred from a deadline.
  for (const source of sources) {
    const facts = (source.details || '').split(/[\n.!?]+/).map(x => x.trim()).filter(x => x.length >= 30 && x.length <= 220 && !/^(due|available|instructions?|write|submit|explain|discuss|reply|create|read|you|must|assignment|quiz|discussion)/i.test(x));
    for (const fact of facts.slice(0, 3)) {
      const definition = fact.match(/^(.{3,55}?)\s+(?:is|means|refers to|are)\s+(.{12,})$/i);
      if (!definition) continue;
      const answer = definition[1];
      const alternatives = facts.filter(x => x !== fact).map(x => x.match(/^(.{3,55}?)\s+(?:is|means|refers to|are)\s+/i)?.[1]).filter((x): x is string => Boolean(x && x !== answer));
      // Require multiple source-supported terms, instead of making up false course facts.
      if (new Set(alternatives).size < 2) continue;
      questions.push({id: `${source.id}:${answer}`, topic: answer, prompt: `According to your imported notes, which term ${fact.slice(answer.length).trim()}?`, choices: [answer, ...Array.from(new Set(alternatives)).slice(0,3)], answer: 0, explanation: `Your notes state: “${fact}.”`, sourceId: source.id, sourceTitle: source.title});
    }
  }
  return questions.sort((a,b) => {
    const score = (topic: string) => mastery[topic]?.attempts ? mastery[topic].correct / mastery[topic].attempts : -1;
    return score(a.topic) - score(b.topic);
  }).map((q,index) => {
    // Rotate the correct answer so a diagnostic is not a sequence of identical options.
    const shift = (index + 1) % q.choices.length;
    return {...q, choices: [...q.choices.slice(shift), ...q.choices.slice(0,shift)], answer: (q.choices.length - shift) % q.choices.length};
  });
}
export function recordAnswer(mastery: Mastery, question: PracticeQuestion, selected: number): Mastery {
  const previous = mastery[question.topic] || {correct: 0, attempts: 0};
  return {...mastery, [question.topic]: {correct: previous.correct + Number(selected === question.answer), attempts: previous.attempts + 1}};
}
export function teachFromSources(question: string, sources: StudySource[]): string {
  const bank = buildDiagnostic(sources);
  const words = question.toLowerCase().match(/[a-z]{4,}/g) || [];
  const match = bank.find(q => words.some(word => (q.topic + ' ' + q.prompt).toLowerCase().includes(word)));
  if (match) return `### ${match.topic}\n\n${match.explanation}\n\nRelated coursework: **${match.sourceTitle}**. Start a diagnostic to check your understanding.`;
  return 'Import the assignment, quiz or discussion instructions and explanatory notes for this topic, then start a diagnostic. On-device practice uses supported Java topics and definitions in your notes. For broader explanations, connect the optional AI service using the connection controls.';
}

/** A fresh application question checks whether the explanation transferred. */
export function buildRetest(missed: PracticeQuestion[]): PracticeQuestion[] {
  const variants: Record<string, {prompt:string; choices:string[]; explanation:string}> = {
    'Java classes and objects': {prompt:'Which line creates an instance of the class Book?',choices:['Book book = new Book();','class Book {}','import Book;','Book = class;'],explanation:'new Book() constructs an object. The variable book holds its reference; declaring class Book defines the blueprint.'},
    'Java inheritance': {prompt:'Given class Cat extends Animal, which statement describes Cat?',choices:['Cat is a subclass of Animal','Animal is a subclass of Cat','Cat and Animal are primitive types','Cat cannot inherit any methods'],explanation:'The class before extends is the subclass. Cat inherits accessible members of Animal and may override eligible methods.'},
    'Java loops': {prompt:'How many times does this body execute? int n = 2; while (n < 5) { n++; }',choices:['3','2','5','0'],explanation:'The condition is true for n = 2, 3 and 4. Each iteration increments n. It stops at 5, after three iterations.'},
    'Java methods': {prompt:'Which declaration describes a method that returns an integer?',choices:['int total()','void total()','class total()','import total()'],explanation:'int is the return type, total is the name, and () is the parameter list. A normal execution path must return an integer.'},
    'Java arrays': {prompt:'For int[] a = {4, 8, 12, 16}, which expression accesses the last element?',choices:['a[a.length - 1]','a[a.length]','a[1]','a[-1]'],explanation:'The length is 4, so the final valid index is 3. a[a.length - 1] returns 16.'},
    'Java input': {prompt:'The next Scanner token is hello. What does hasNextInt() return?',choices:['false','true','hello','0'],explanation:'hello is not a valid integer token. hasNextInt() returns false without consuming it; use next() to consume invalid input before retrying.'},
    'Java strings': {prompt:'What does "Java".equals("java") return?',choices:['false','true','null','A compilation error'],explanation:'String.equals compares contents case-sensitively. Uppercase J differs from lowercase j. equalsIgnoreCase would return true.'},
  };
  return missed.map((question,index) => {
    const variant = variants[question.topic];
    const q = variant ? {...question,...variant,answer:0} : {...question,prompt:`Recall from your notes: ${question.prompt}`};
    const offset = (index+1)%q.choices.length;
    return {...q,id:q.id+':retest',choices:[...q.choices.slice(offset),...q.choices.slice(0,offset)],answer:(q.answer-offset+q.choices.length)%q.choices.length};
  });
}
