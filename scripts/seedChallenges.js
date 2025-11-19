// teensha/prisma/seedChallenges.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Generate unique ID for task options
 */
function generateUniqueId(prefix, index) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}-${index}`;
}

/**
 * Process task options to add IDs where missing
 */
function processTaskOptions(taskType, options) {
  if (!options) return null;

  let processedOptions = { ...options };

  switch (taskType) {
    case 'CHECKLIST':
      if (options.items && Array.isArray(options.items)) {
        processedOptions.items = options.items.map((item, index) => {
          // Handle both string and object formats
          if (typeof item === 'string') {
            return {
              id: generateUniqueId('item', index),
              text: item,
            };
          }
          return {
            ...item,
            id: item.id || generateUniqueId('item', index),
            text: item.text || item.title || item.name || `Item ${index + 1}`,
          };
        });
      }
      break;

    case 'QUIZ':
      if (options.questions && Array.isArray(options.questions)) {
        processedOptions.questions = options.questions.map(
          (question, index) => ({
            ...question,
            id: question.id || generateUniqueId('question', index),
            text: question.text || question.question || '',
            options: question.options || [],
          })
        );
      }
      break;

    case 'FORM':
      if (options.fields && Array.isArray(options.fields)) {
        processedOptions.fields = options.fields.map((field, index) => ({
          ...field,
          id: field.id || generateUniqueId('field', index),
          label: field.label || field.name || `Field ${index + 1}`,
          type: field.type || 'text',
          required: field.required !== undefined ? field.required : false,
        }));
      }
      break;

    case 'PICK_ONE':
      if (options.options && Array.isArray(options.options)) {
        processedOptions.options = options.options.map((option, index) => {
          if (typeof option === 'string') {
            return {
              id: generateUniqueId('option', index),
              title: option,
              description: '',
            };
          }
          return {
            ...option,
            id: option.id || generateUniqueId('option', index),
            title:
              option.title ||
              option.text ||
              option.name ||
              `Option ${index + 1}`,
          };
        });
      }
      break;

    default:
      break;
  }

  return processedOptions;
}

/**
 * Update all existing tasks with proper IDs in their options
 */
async function updateExistingTasks() {
  console.log('\n🔄 Updating existing tasks with proper IDs...');

  const tasks = await prisma.task.findMany({
    where: {
      taskType: {
        in: ['CHECKLIST', 'QUIZ', 'FORM', 'PICK_ONE'],
      },
    },
  });

  console.log(`Found ${tasks.length} tasks that need ID updates`);

  let updatedCount = 0;

  for (const task of tasks) {
    try {
      const processedOptions = processTaskOptions(task.taskType, task.options);

      if (processedOptions) {
        await prisma.task.update({
          where: { id: task.id },
          data: {
            options: processedOptions,
          },
        });

        console.log(`  ✅ Updated ${task.taskType} task: ${task.title}`);
        updatedCount++;
      }
    } catch (error) {
      console.error(`  ❌ Error updating task ${task.id}:`, error.message);
    }
  }

  console.log(`✅ Successfully updated ${updatedCount} tasks with proper IDs`);
}

/**
 * Get comprehensive task templates for each tab
 */
function getTaskTemplates(month) {
  return [
    // BIBLE STUDY TASKS
    {
      tabName: 'Bible Study',
      title: 'Daily Scripture Reading',
      description: `Read the assigned Bible passages for ${getMonthName(
        month
      )}. Reflect on what God is teaching you through His Word.`,
      taskType: 'TEXT',
      isRequired: true,
      completionRule: 'Complete daily readings and submit reflections',
      maxScore: 100,
      options: null,
    },
    {
      tabName: 'Bible Study',
      title: 'Memory Verse Challenge',
      description:
        "Memorize and recite this month's memory verse. Submit a video of your recitation.",
      taskType: 'VIDEO',
      isRequired: true,
      completionRule: 'Submit video recitation',
      maxScore: 100,
      options: null,
    },
    {
      tabName: 'Bible Study',
      title: 'Bible Study Quiz',
      description: "Test your knowledge of this month's Bible passages",
      taskType: 'QUIZ',
      isRequired: false,
      completionRule: 'Answer all questions',
      maxScore: 80,
      options: {
        questions: [
          {
            id: generateUniqueId('question', 0),
            text: "What is the main theme of this month's readings?",
            options: ['Faith', 'Love', 'Hope', 'Obedience'],
            correctAnswer: 'Faith',
          },
          {
            id: generateUniqueId('question', 1),
            text: 'Which book did we focus on this month?',
            options: ['Genesis', 'Psalms', 'Proverbs', 'Matthew'],
            correctAnswer: 'Psalms',
          },
          {
            id: generateUniqueId('question', 2),
            text: 'What does the memory verse teach us?',
            options: [
              'Trust in God',
              'Love your neighbor',
              'Pray always',
              'Be humble',
            ],
            correctAnswer: 'Trust in God',
          },
        ],
      },
    },

    // BOOK OF THE MONTH TASKS
    {
      tabName: 'Book of the Month',
      title: 'Chapter Summaries',
      description: 'Write a brief summary for each chapter you read this month',
      taskType: 'TEXT',
      isRequired: true,
      completionRule: 'Submit summaries for all assigned chapters',
      maxScore: 100,
      options: null,
    },
    {
      tabName: 'Book of the Month',
      title: 'Book Review',
      description:
        "Write a comprehensive review of this month's book. Include your favorite parts, lessons learned, and how it impacted you.",
      taskType: 'TEXT',
      isRequired: false,
      completionRule: 'Submit detailed review (500+ words)',
      maxScore: 150,
      options: null,
    },
    {
      tabName: 'Book of the Month',
      title: 'Favorite Quote',
      description:
        'Share your favorite quote from the book and explain why it resonated with you',
      taskType: 'PICK_ONE',
      isRequired: false,
      completionRule: 'Select and explain one quote',
      maxScore: 50,
      options: {
        options: [
          {
            id: generateUniqueId('option', 0),
            title: 'A quote about faith',
            description:
              'Choose a quote that speaks about faith or trust in God',
          },
          {
            id: generateUniqueId('option', 1),
            title: 'A quote about character',
            description: 'Choose a quote about building godly character',
          },
          {
            id: generateUniqueId('option', 2),
            title: 'A quote about relationships',
            description: 'Choose a quote about loving others',
          },
        ],
      },
    },

    // ACTIVITIES TASKS
    {
      tabName: 'Activities',
      title: 'Community Service Project',
      description:
        'Participate in a community service activity. Upload photos and describe your experience.',
      taskType: 'IMAGE',
      isRequired: false,
      completionRule: 'Upload at least 2 photos with descriptions',
      maxScore: 100,
      options: null,
    },
    {
      tabName: 'Activities',
      title: 'Weekly Exercise Routine',
      description:
        'Complete your weekly exercise routine. Check off each day you exercise.',
      taskType: 'CHECKLIST',
      isRequired: false,
      completionRule: 'Complete at least 3 days of exercise',
      maxScore: 80,
      options: {
        items: [
          {
            id: generateUniqueId('item', 0),
            text: 'Monday - 30 minutes cardio',
          },
          {
            id: generateUniqueId('item', 1),
            text: 'Tuesday - Strength training',
          },
          {
            id: generateUniqueId('item', 2),
            text: 'Wednesday - Yoga or stretching',
          },
          {
            id: generateUniqueId('item', 3),
            text: 'Thursday - Sports or outdoor activity',
          },
          {
            id: generateUniqueId('item', 4),
            text: 'Friday - Dance or aerobics',
          },
          { id: generateUniqueId('item', 5), text: 'Saturday - Team sports' },
          {
            id: generateUniqueId('item', 6),
            text: 'Sunday - Light walk or rest',
          },
        ],
      },
    },
    {
      tabName: 'Activities',
      title: 'Family Time Checklist',
      description: 'Spend quality time with your family this month',
      taskType: 'CHECKLIST',
      isRequired: false,
      completionRule: 'Complete at least 4 activities',
      maxScore: 70,
      options: {
        items: [
          { id: generateUniqueId('item', 0), text: 'Have a family game night' },
          { id: generateUniqueId('item', 1), text: 'Cook a meal together' },
          { id: generateUniqueId('item', 2), text: 'Watch a movie together' },
          { id: generateUniqueId('item', 3), text: 'Go on a family outing' },
          {
            id: generateUniqueId('item', 4),
            text: 'Have meaningful conversations at dinner',
          },
          {
            id: generateUniqueId('item', 5),
            text: 'Help with household chores',
          },
        ],
      },
    },

    // PROJECTS TASKS
    {
      tabName: 'Projects',
      title: 'Creative Project',
      description: `Create something inspired by this month's theme: ${getChallengeTheme(
        month
      )}. This could be art, music, writing, or any creative expression.`,
      taskType: 'IMAGE',
      isRequired: true,
      completionRule: 'Upload photos of your completed project',
      maxScore: 150,
      options: null,
    },
    {
      tabName: 'Projects',
      title: 'Monthly Reflection Essay',
      description:
        "Write a reflection essay about what you learned this month and how you've grown.",
      taskType: 'TEXT',
      isRequired: true,
      completionRule: 'Submit essay (300+ words)',
      maxScore: 100,
      options: null,
    },
    {
      tabName: 'Projects',
      title: 'Goal Setting Form',
      description:
        'Set your personal, spiritual, and academic goals for next month',
      taskType: 'FORM',
      isRequired: false,
      completionRule: 'Complete all fields',
      maxScore: 60,
      options: {
        fields: [
          {
            id: generateUniqueId('field', 0),
            label: 'Spiritual Goal',
            type: 'textarea',
            placeholder: 'What spiritual habit do you want to develop?',
            required: true,
          },
          {
            id: generateUniqueId('field', 1),
            label: 'Academic Goal',
            type: 'textarea',
            placeholder: 'What do you want to achieve academically?',
            required: true,
          },
          {
            id: generateUniqueId('field', 2),
            label: 'Personal Development Goal',
            type: 'textarea',
            placeholder: 'How do you want to grow personally?',
            required: true,
          },
          {
            id: generateUniqueId('field', 3),
            label: 'Action Steps',
            type: 'textarea',
            placeholder: 'What specific steps will you take?',
            required: false,
          },
        ],
      },
    },
  ];
}

/**
 * Add missing tasks to challenges
 */
async function addMissingTasks() {
  console.log('\n📝 Checking and adding missing tasks to challenges...');

  const challenges = await prisma.monthlyChallenge.findMany({
    include: {
      tasks: true,
      _count: {
        select: { tasks: true },
      },
    },
  });

  console.log(`Found ${challenges.length} challenges to check`);

  const staff = await prisma.user.findUnique({
    where: { email: 'staff@teenshapers.com' },
  });

  if (!staff) {
    console.error('❌ Staff user not found. Please run user seed first.');
    return;
  }

  let totalTasksAdded = 0;

  for (const challenge of challenges) {
    console.log(
      `\n📋 Processing: ${getMonthName(challenge.month)} ${challenge.year}`
    );
    console.log(`   Existing tasks: ${challenge._count.tasks}`);

    const taskTemplates = getTaskTemplates(challenge.month);

    // Check which tabs and task types are missing
    const existingTaskKeys = challenge.tasks.map(
      (t) => `${t.tabName}-${t.taskType}-${t.title}`
    );

    let tasksAddedForChallenge = 0;

    for (const template of taskTemplates) {
      const taskKey = `${template.tabName}-${template.taskType}-${template.title}`;

      if (!existingTaskKeys.includes(taskKey)) {
        try {
          await prisma.task.create({
            data: {
              challengeId: challenge.id,
              ...template,
              dueDate: challenge.closingDate,
              createdById: staff.id,
            },
          });

          console.log(
            `   ✅ Added: ${template.tabName} - ${template.title} (${template.taskType})`
          );
          tasksAddedForChallenge++;
          totalTasksAdded++;
        } catch (error) {
          console.error(
            `   ❌ Error adding task: ${template.title}`,
            error.message
          );
        }
      }
    }

    if (tasksAddedForChallenge === 0) {
      console.log(`   ℹ️  No missing tasks - challenge is complete`);
    } else {
      console.log(
        `   📊 Added ${tasksAddedForChallenge} tasks to this challenge`
      );
    }
  }

  console.log(
    `\n✅ Total tasks added across all challenges: ${totalTasksAdded}`
  );
}

/**
 * Helper functions
 */
function getMonthName(month) {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return months[month - 1];
}

function getChallengeTheme(month) {
  const themes = [
    'New Beginnings - Setting Goals for the Year',
    'Love and Kindness - Showing Love to Others',
    'Faith and Courage - Standing Strong',
    'Renewal and Growth - Spring Into Action',
    'Service and Humility - Serving Our Community',
    'Identity in Christ - Knowing Who You Are',
    'Freedom and Responsibility - Using Your Gifts',
    'Gratitude and Generosity - Counting Your Blessings',
    'Wisdom and Learning - Back to School Special',
    'Thankfulness - Developing an Attitude of Gratitude',
    'Compassion - Helping Those in Need',
    "Celebration - Reflecting on God's Faithfulness",
  ];
  return themes[month - 1];
}

/**
 * Main seed function
 */
async function main() {
  console.log('🌱 Starting comprehensive seed process...\n');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123TeenShappers', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@teenshapers.com' },
    update: {},
    create: {
      email: 'admin@teenshapers.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin user created/updated');

  // Create staff user
  const staffPassword = await bcrypt.hash('staff123', 12);

  const staff = await prisma.user.upsert({
    where: { email: 'staff@teenshapers.com' },
    update: {},
    create: {
      email: 'staff@teenshapers.com',
      password: staffPassword,
      name: 'Staff User',
      role: 'STAFF',
    },
  });

  console.log('✅ Staff user created/updated');

  // Create sample teen
  const teenPassword = await bcrypt.hash('teen123', 12);

  const teen = await prisma.teen.upsert({
    where: { email: 'teen@example.com' },
    update: {},
    create: {
      email: 'teen@example.com',
      password: teenPassword,
      name: 'Emeka Isah',
      age: 12,
      gender: 'Other',
      state: 'Abuja',
      country: 'Nigeria',
      optInPublic: true,
    },
  });

  console.log('✅ Teen user created/updated');

  // Update existing tasks with proper IDs
  await updateExistingTasks();

  // Add missing tasks to all challenges
  await addMissingTasks();

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log('   Admin:', admin.email, '- Password: admin123TeenShappers');
  console.log('   Staff:', staff.email, '- Password: staff123');
  console.log('   Teen:', teen.email, '- Password: teen123');
  console.log(
    '\n💡 All challenges now have complete task sets with proper IDs'
  );
  console.log('   - Bible Study: 3 tasks (TEXT, VIDEO, QUIZ)');
  console.log('   - Book of the Month: 3 tasks (TEXT, TEXT, PICK_ONE)');
  console.log('   - Activities: 3 tasks (IMAGE, CHECKLIST, CHECKLIST)');
  console.log('   - Projects: 3 tasks (IMAGE, TEXT, FORM)');
  console.log('   - Total: 12 tasks per challenge');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
