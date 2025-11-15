// scripts/seedChallenges.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed process...');

  try {
    // Get existing users and teens
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@teenshapers.com' },
    });

    const staff = await prisma.user.findUnique({
      where: { email: 'staff@teenshapers.com' },
    });

    const teen = await prisma.teen.findUnique({
      where: { email: 'teen@example.com' },
    });

    if (!admin || !staff || !teen) {
      console.error(
        '❌ Required users not found. Please run the user seed script first.'
      );
      return;
    }

    console.log('✅ Found existing users and teen');

    // Create additional teens for more realistic data
    const teenPassword = await bcrypt.hash('teen123', 12);

    const additionalTeens = await Promise.all([
      prisma.teen.upsert({
        where: { email: 'sarah@example.com' },
        update: {},
        create: {
          email: 'sarah@example.com',
          password: teenPassword,
          name: 'Sarah Johnson',
          age: 15,
          gender: 'Female',
          state: 'Lagos',
          country: 'Nigeria',
          optInPublic: true,
        },
      }),
      prisma.teen.upsert({
        where: { email: 'david@example.com' },
        update: {},
        create: {
          email: 'david@example.com',
          password: teenPassword,
          name: 'David Okonkwo',
          age: 16,
          gender: 'Male',
          state: 'Port Harcourt',
          country: 'Nigeria',
          optInPublic: false,
        },
      }),
      prisma.teen.upsert({
        where: { email: 'grace@example.com' },
        update: {},
        create: {
          email: 'grace@example.com',
          password: teenPassword,
          name: 'Grace Adeyemi',
          age: 14,
          gender: 'Female',
          state: 'Ibadan',
          country: 'Nigeria',
          optInPublic: true,
        },
      }),
    ]);

    const allTeens = [teen, ...additionalTeens];
    console.log(`✅ Created/found ${allTeens.length} teens`);

    // Create challenges for the current year and previous months
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12

    const challenges = [];

    // Create challenges for January to current month
    for (let month = 1; month <= Math.min(currentMonth + 1, 12); month++) {
      const goLiveDate = new Date(currentYear, month - 1, 1);
      const closingDate = new Date(currentYear, month, 0, 23, 59, 59);

      const challenge = await prisma.monthlyChallenge.upsert({
        where: {
          year_month: {
            year: currentYear,
            month: month,
          },
        },
        update: {},
        create: {
          year: currentYear,
          month: month,
          theme: getChallengeTheme(month),
          instructions: getChallengeInstructions(month),
          goLiveDate,
          closingDate,
          isPublished: month <= currentMonth, // Publish past and current month
          isActive: true,
          createdById: month % 2 === 0 ? admin.id : staff.id, // Alternate between admin and staff
        },
      });

      challenges.push(challenge);
      console.log(
        `✅ Created challenge for ${getMonthName(month)} ${currentYear}`
      );

      // Create badge for this challenge
      const badge = await prisma.badge.upsert({
        where: { challengeId: challenge.id },
        update: {},
        create: {
          challengeId: challenge.id,
          name: `${getMonthName(month)} ${currentYear} Badge`,
          description: `Awarded for completing the ${getMonthName(
            month
          )} challenge`,
          imageUrl: `https://res.cloudinary.com/demo/image/upload/badges/${month}.png`,
          price: 500 + month * 50, // Varying prices
          isActive: true,
        },
      });

      console.log(`  ✅ Created badge: ${badge.name}`);

      // Create tasks for this challenge
      const taskTypes = [
        'TEXT',
        'IMAGE',
        'VIDEO',
        'QUIZ',
        'PICK_ONE',
        'CHECKLIST',
      ];
      const tabs = [
        'Bible Study',
        'Book of the Month',
        'Activities',
        'Projects',
      ];

      const tasksData = [
        {
          tabName: 'Bible Study',
          title: 'Daily Scripture Reading',
          description: 'Read and reflect on assigned Bible passages',
          taskType: 'TEXT',
          isRequired: true,
          completionRule: 'Complete all readings',
          maxScore: 100,
        },
        {
          tabName: 'Bible Study',
          title: 'Memory Verse',
          description: 'Memorize and recite the monthly verse',
          taskType: 'VIDEO',
          isRequired: true,
          completionRule: 'Submit video recitation',
          maxScore: 100,
        },
        {
          tabName: 'Book of the Month',
          title: 'Chapter Summary',
          description: 'Write summaries for each chapter',
          taskType: 'TEXT',
          isRequired: true,
          completionRule: 'Submit all chapter summaries',
          maxScore: 100,
        },
        {
          tabName: 'Book of the Month',
          title: 'Book Review',
          description: 'Write a comprehensive book review',
          taskType: 'TEXT',
          isRequired: false,
          completionRule: 'Submit detailed review',
          maxScore: 150,
        },
        {
          tabName: 'Activities',
          title: 'Community Service',
          description: 'Participate in community service activity',
          taskType: 'IMAGE',
          isRequired: false,
          completionRule: 'Upload photo evidence',
          maxScore: 100,
        },
        {
          tabName: 'Activities',
          title: 'Physical Exercise',
          description: 'Complete weekly exercise routine',
          taskType: 'CHECKLIST',
          isRequired: false,
          completionRule: 'Complete at least 3 days',
          options: {
            items: [
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
              'Friday',
              'Saturday',
              'Sunday',
            ],
          },
          maxScore: 80,
        },
        {
          tabName: 'Projects',
          title: 'Creative Project',
          description: 'Create something inspired by the monthly theme',
          taskType: 'IMAGE',
          isRequired: true,
          completionRule: 'Submit project photos',
          maxScore: 150,
        },
        {
          tabName: 'Projects',
          title: 'Reflection Essay',
          description: 'Write about what you learned this month',
          taskType: 'TEXT',
          isRequired: true,
          completionRule: 'Submit essay (300+ words)',
          maxScore: 100,
        },
      ];

      const createdTasks = [];
      for (const taskData of tasksData) {
        const task = await prisma.task.create({
          data: {
            challengeId: challenge.id,
            ...taskData,
            dueDate: closingDate,
            createdById: staff.id,
          },
        });
        createdTasks.push(task);
      }

      console.log(`  ✅ Created ${createdTasks.length} tasks`);

      // Create submissions for past challenges
      if (month < currentMonth) {
        for (const currentTeen of allTeens) {
          // Randomly decide if teen participated (80% chance)
          if (Math.random() > 0.2) {
            let completedTasks = 0;

            for (const task of createdTasks) {
              // 70% chance of completing each task
              if (Math.random() > 0.3) {
                const submission = await prisma.submission.create({
                  data: {
                    taskId: task.id,
                    teenId: currentTeen.id,
                    content: getSubmissionContent(task.taskType),
                    fileUrls:
                      task.taskType === 'IMAGE' || task.taskType === 'VIDEO'
                        ? [
                            `https://res.cloudinary.com/demo/image/upload/submissions/${task.id}-${currentTeen.id}.jpg`,
                          ]
                        : [],
                    status: 'APPROVED',
                    score: Math.floor(Math.random() * 30) + 70, // Score between 70-100
                    reviewerId: admin.id,
                    reviewNote: 'Great work! Keep it up.',
                    reviewedAt: new Date(
                      currentYear,
                      month - 1,
                      Math.floor(Math.random() * 28) + 1
                    ),
                  },
                });
                completedTasks++;
              }
            }

            // Create progress record
            const percentage = (completedTasks / createdTasks.length) * 100;
            await prisma.teenProgress.create({
              data: {
                teenId: currentTeen.id,
                challengeId: challenge.id,
                tasksTotal: createdTasks.length,
                tasksCompleted: completedTasks,
                percentage: Math.round(percentage),
                completedAt: percentage === 100 ? closingDate : null,
              },
            });

            // Award badge if challenge completed
            if (percentage === 100) {
              await prisma.teenBadge.create({
                data: {
                  teenId: currentTeen.id,
                  badgeId: badge.id,
                  status: Math.random() > 0.5 ? 'EARNED' : 'PURCHASED',
                  purchasedAt:
                    Math.random() > 0.5
                      ? new Date(currentYear, month - 1, 15)
                      : null,
                  earnedAt: new Date(currentYear, month - 1, 28),
                },
              });
            }
          }
        }
        console.log(`  ✅ Created submissions and progress for past challenge`);
      }

      // Create some submissions for current month challenge
      if (month === currentMonth) {
        for (const currentTeen of allTeens) {
          // Random participation (60% chance)
          if (Math.random() > 0.4) {
            let completedTasks = 0;

            // Complete 2-5 tasks randomly
            const tasksToComplete = Math.floor(Math.random() * 4) + 2;
            const shuffledTasks = createdTasks.sort(() => 0.5 - Math.random());

            for (
              let i = 0;
              i < Math.min(tasksToComplete, createdTasks.length);
              i++
            ) {
              const task = shuffledTasks[i];

              await prisma.submission.create({
                data: {
                  taskId: task.id,
                  teenId: currentTeen.id,
                  content: getSubmissionContent(task.taskType),
                  fileUrls:
                    task.taskType === 'IMAGE' || task.taskType === 'VIDEO'
                      ? [
                          `https://res.cloudinary.com/demo/image/upload/submissions/${task.id}-${currentTeen.id}.jpg`,
                        ]
                      : [],
                  status: i === 0 ? 'PENDING' : 'APPROVED', // First one pending for review
                  score: i === 0 ? null : Math.floor(Math.random() * 30) + 70,
                  reviewerId: i === 0 ? null : admin.id,
                  reviewNote: i === 0 ? null : 'Good effort!',
                  reviewedAt: i === 0 ? null : new Date(),
                },
              });

              if (i !== 0) completedTasks++;
            }

            // Create progress record
            const percentage = (completedTasks / createdTasks.length) * 100;
            await prisma.teenProgress.create({
              data: {
                teenId: currentTeen.id,
                challengeId: challenge.id,
                tasksTotal: createdTasks.length,
                tasksCompleted: completedTasks,
                percentage: Math.round(percentage),
              },
            });

            // Create badge record (available but not yet earned)
            await prisma.teenBadge.create({
              data: {
                teenId: currentTeen.id,
                badgeId: badge.id,
                status: 'AVAILABLE',
              },
            });
          }
        }
        console.log(`  ✅ Created current month submissions and progress`);
      }
    }

    // Create raffle entries for teens who completed challenges
    console.log('\n🎟️ Creating raffle entries...');
    for (const currentTeen of allTeens) {
      const completedChallenges = await prisma.teenProgress.count({
        where: {
          teenId: currentTeen.id,
          percentage: 100,
          challenge: {
            year: currentYear,
          },
        },
      });

      // Eligible if completed at least 6 challenges
      const isEligible = completedChallenges >= 6;

      await prisma.raffleEntry.upsert({
        where: {
          teenId_year: {
            teenId: currentTeen.id,
            year: currentYear,
          },
        },
        update: { isEligible },
        create: {
          teenId: currentTeen.id,
          year: currentYear,
          isEligible,
        },
      });

      console.log(
        `  ✅ ${currentTeen.name}: ${completedChallenges} challenges completed, eligible: ${isEligible}`
      );
    }

    // Create raffle draw for last year (if you want history)
    const lastYear = currentYear - 1;
    const eligibleLastYear = allTeens[0]; // First teen won last year

    await prisma.raffleDraw.upsert({
      where: { year: lastYear },
      update: {},
      create: {
        year: lastYear,
        prize: 'iPad Pro 11-inch',
        description: 'Grand prize for completing all monthly challenges',
        winnerId: eligibleLastYear.id,
        drawnAt: new Date(lastYear, 11, 15), // December 15th
      },
    });

    console.log(`\n🎉 Created raffle draw for ${lastYear}`);

    console.log('\n✅ Seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Challenges: ${challenges.length}`);
    console.log(`   - Teens: ${allTeens.length}`);
    console.log(`   - Tasks per challenge: 8`);
    console.log(`   - Total submissions: Check database`);
  } catch (error) {
    console.error('❌ Error during seed:', error);
    throw error;
  }
}

// Helper functions
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

function getChallengeInstructions(month) {
  return `Complete the tasks in this month's challenge to grow spiritually, intellectually, and in service to others. Focus on ${getChallengeTheme(
    month
  ).toLowerCase()} as you work through the Bible studies, book discussions, activities, and projects. Remember to submit all required tasks before the deadline!`;
}

function getSubmissionContent(taskType) {
  switch (taskType) {
    case 'TEXT':
      return {
        text: 'This is my submission for this task. I learned a lot and really enjoyed working on it. Here are my key takeaways and reflections...',
      };
    case 'QUIZ':
      return {
        answers: {
          q1: 'B',
          q2: 'A',
          q3: 'C',
          q4: 'D',
        },
      };
    case 'PICK_ONE':
      return {
        selected: 'Option 2',
      };
    case 'CHECKLIST':
      return {
        completed: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
      };
    case 'FORM':
      return {
        field1: 'Response 1',
        field2: 'Response 2',
      };
    default:
      return {
        text: 'Completed',
      };
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
