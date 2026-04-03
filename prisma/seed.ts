import "dotenv/config";
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/auth';

async function main() {
  console.log('🌱 Seeding database...');

  // Create default admin user
  const hashedPassword = await hashPassword(process.env.ADMIN_PASSWORD || 'AdminIRAFASHA@2025');

  try {
    const admin = await prisma.adminUser.create({
      data: {
        email: process.env.ADMIN_EMAIL || 'ndahayemmanuel@gmail.com',
        password: hashedPassword,
        name: 'IM Admin',
        role: 'admin',
        emailVerified: true,  // Phase 1: Mark admin as verified on seed
      },
    });

    console.log('✅ Admin user created:', admin.email);

    // Create sample categories
    const categories = [
      { name: 'Amakuru', slug: 'amakuru', description: 'Breaking News' },
      { name: 'Politiki', slug: 'politiki', description: 'Politics' },
      { name: 'Ubuzima', slug: 'ubuzima', description: 'Health' },
      { name: 'Uburezi', slug: 'uburezi', description: 'Education' },
      { name: 'Ubukungu', slug: 'ubukungu', description: 'Business & Economy' },
      { name: 'Ikoranabuhanga', slug: 'ikoranabuhanga', description: 'Technology' },
      { name: 'Imyidagaduro', slug: 'imyidagaduro', description: 'Culture & Entertainment' },
      { name: 'Ubushakashatsi', slug: 'ubushakashatsi', description: 'Investigations & Analysis' },
    ];

    for (const cat of categories) {
      const existing = await prisma.category.findUnique({
        where: { slug: cat.slug },
      });

      if (!existing) {
        const category = await prisma.category.create({
          data: {
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
            status: 'active',
          },
        });
        console.log(`✅ Category created: ${category.name}`);
      }
    }

    // Create sample Kinyarwanda articles
    const articles = [
      {
        title: 'Ubwigunge bw\'u Rwanda mu gihe cy\'amadeni',
        slug: 'ubwigunge-bu-rwanda-mu-gihe-cy-amadeni',
        excerpt: 'Iki kiganiro gikubiyemo ubwigunge n\'ubwenge bw\'u Rwanda mu gihe cy\'amadeni ya tekinoroji.',
        content: 'U Rwanda rwakemuka neza mu nzira y\'ubwigunge bwa tekinoroji. Umushinga w\'Igihugu wa tekinoroji wazamuye abantu benshi n\'akamuhanda ka digitale. Ibi bikorwa byatangiye mu mwaka wa 2020 kandi ubwigunge bwacu bwakomeje kumiyukira.',
        categoryId: undefined,
        author: 'Amakuru Team',
        status: 'published',
        featured: true,
        readTime: 7,
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
      },
      {
        title: 'Politiki y\'ingeri y\'abaturage mu Rwanda',
        slug: 'politiki-y-ingeri-y-abaturage-mu-rwanda',
        excerpt: 'Inzira mpya y\'ubwiyunge bw\'abaturage mu gihugu cy\'u Rwanda.',
        content: 'Guverinoma y\'u Rwanda yashyiraho politiki mpya yo mu burezi bw\'abaturage. Izi politiki zikamuhirangira abantu benshi n\'akamuhanda ka democracy. Umushinga w\'igihugu waharanira amahoro n\'ubwiyunge bw\'abaturage.',
        categoryId: undefined,
        author: 'John Hoza',
        status: 'published',
        featured: false,
        readTime: 5,
        image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
      },
      {
        title: 'Ubuzima bw\'abana mu Rwanda: Ibyo biteganyije mu 2026',
        slug: 'ubuzima-bw-abana-mu-rwanda-ibyo-biteganyije',
        excerpt: 'Gahunda nshya y\'ubuzima bw\'abana mu Rwanda.',
        content: 'Minisiteri y\'ubuzima yarahaye umushinga w\'ubuzima bw\'abana mu nzira y\'ubwiyunge. Ibi bikorwa birazamuhora indwara y\'ubwubunu n\'ibindi birwaye.Umushinga utazamuhora abantu 100,000 mu Rwanda.',
        categoryId: undefined,
        author: 'Dr. Marie Mukantira',
        status: 'published',
        featured: false,
        readTime: 6,
        image: 'https://images.unsplash.com/photo-1576091160550-112173f7f869?w=800&q=80',
      },
      {
        title: 'Uburezi bu nzira mpya mu mateka ya Rwanda',
        slug: 'uburezi-bu-nzira-mpya-mu-mateka-ya-rwanda',
        excerpt: 'Inzira mpya y\'uburezi mu mateka n\'ubwiyunge bw\'igihugu.',
        content: 'Ingoro y\'uburezi mu Rwanda yashyiraho inzira mpya yo mu mateka y\'igihugu. Ibi bikorwa bikaba intego yo kwibuka ihabwa abana n\'abagore bose. Umushinga utazamuteza inzira y\'ubwiyunge bw\'igihugu.',
        categoryId: undefined,
        author: 'Prof. Emmanuel Gasaro',
        status: 'published',
        featured: false,
        readTime: 8,
        image: 'https://images.unsplash.com/photo-1427504494726-f74560b62989?w=800&q=80',
      },
      {
        title: 'Ubukungu bw\'u Rwanda bushyikana mu ijabo',
        slug: 'ubukungu-bw-u-rwanda-bushyikana-mu-ijabo',
        excerpt: 'Igaramire y\'ubukungu bw\'u Rwanda mu gihembwe cyambere cya 2026.',
        content: 'Banki y\'igihugu yaratangiye igihonde cy\'ubukungu mu gihembwe cyambere. Ubukungu bw\'u Rwanda bushyikana mu igipimo cy\'amafaranga ku buri munyarwanda. Ibi bikorwa bisigira ingero y\'ubwiyunge bw\'abantu.',
        categoryId: undefined,
        author: 'Alphonse Kagina',
        status: 'published',
        featured: true,
        readTime: 7,
        image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
      },
      {
        title: 'Tekinoroji nshya y\'intarineti mu Rwanda',
        slug: 'tekinoroji-nshya-y-intarineti-mu-rwanda',
        excerpt: 'Umushinga w\'intarineti inzira nshya mu nzira y\'igihugu.',
        content: 'Umushinga w\'intarineti y\'inzira nshya wazamuteza abageni benshi mu cyahoze cyari kigihugu. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu bose imihanda y\'intarineti. Umushinga utazamuhora abantu 5 miliyoni mu Rwanda.',
        categoryId: undefined,
        author: 'Tech Team Rwanda',
        status: 'published',
        featured: false,
        readTime: 6,
        image: 'https://images.unsplash.com/photo-1633356122544-f134324ef6db?w=800&q=80',
      },
      {
        title: 'Imyidagaduro y\'u Rwanda: Igihembe cy\'amadeni',
        slug: 'imyidagaduro-y-u-rwanda-igihembe-cy-amadeni',
        excerpt: 'Ubwiyunge bw\'imyidagaduro mu Rwanda mu gihembwe cy\'amadeni.',
        content: 'Ibikorwa by\'imyidagaduro mu Rwanda byatangiye ku mwaka w\'amadeni yishize. Umushinga w\'ubwiyunge bw\'ubugeni n\'imvugo wazamuteza intera y\'ubwigunge. Ibi ntibyari bikunze mu ijambo rya Rwanda ryose.',
        categoryId: undefined,
        author: 'Arts Rwanda',
        status: 'published',
        featured: false,
        readTime: 5,
        image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80',
      },
      {
        title: 'Iyobokamana mu Rwanda: Amarushanwa nshya ya APR FC',
        slug: 'iyobokamana-mu-rwanda-amarushanwa-nshya-ya-apr-fc',
        excerpt: 'APR FC yatsinzire umukino w\'iyobokamana mu Rwanda.',
        content: 'APR FC yatsinzire umukino w\'umukinnyi w\'iyobokamana mu cyahoze kirarwaye. Umwami w\'iyi mikino yakagize umwanya mwiza mu ijambo rya iyobokamana. Ibi byari umwaka wambere Yambere mu ijambo ry\'igihugu.',
        categoryId: undefined,
        author: 'Sports Correspondent',
        status: 'published',
        featured: false,
        readTime: 4,
        image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80',
      },
      {
        title: 'Bushakashatsi: Ubwiyunge bw\'ubugeni mu gihe cy\'amadeni',
        slug: 'bushakashatsi-ubwiyunge-bw-ubugeni-mu-gihe-cy-amadeni',
        excerpt: 'Ubushakashatsi bushya bubusubusu ubwiyunge bw\'ubugeni mu Rwanda.',
        content: 'Imbega y\'ubushakashatsi y\'igihugu yarashyiraho umushinga w\'ubushakashatsi bushya. Ibi bikorwa bikaba intego yo kwihana ubwiyunge bw\'ubugeni mu gihe cy\'amadeni. Abashakashatsi 50 baratangije ibyo kazi mu nzira mpya.',
        categoryId: undefined,
        author: 'Dr. Vincent Muvandi',
        status: 'published',
        featured: false,
        readTime: 7,
        image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80',
      },
      {
        title: 'Urwanya rw\'indwara y\'ubwubunu mu Rwanda',
        slug: 'urwanya-rw-indwara-y-ubwubunu-mu-rwanda',
        excerpt: 'Ubwigenge bw\'igihugu bukampira indwara y\'ubwubunu.',
        content: 'Minisiteri y\'ubuzima yatangiye umushinga w\'urwanya rw\'indwara y\'ubwubunu. Iki kiganiro gikubiyemo ubwiyunge bw\'ubugeni n\'ubwigunge bw\'igihugu cyose. Amafaranga azo mahiguriranye amaraso y\'abantu 100,000 mu Rwanda.',
        categoryId: undefined,
        author: 'Dr. Justine Kizito',
        status: 'published',
        featured: true,
        readTime: 8,
        image: 'https://images.unsplash.com/photo-1576091160550-112173f7f869?w=800&q=80',
      },
      {
        title: 'Imigambi y\'igihugu itari mu nyungu y\'abantu benshi',
        slug: 'imigambi-y-igihugu-itari-mu-nyungu-y-abantu-benshi',
        excerpt: 'Itangazo ry\'imigambi y\'igihugu mu 2026.',
        content: 'Guverinoma y\'u Rwanda yatangiye imigambi y\'igihugu itari mu nyungu y\'abantu benshi. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'igihugu. Umushinga utazamuhora miliyoni y\'abarwandi.,',
        categoryId: undefined,
        author: 'Political Analyst',
        status: 'published',
        featured: false,
        readTime: 6,
        image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
      },
      {
        title: 'Amafaranga atsinzwe ku burezi bw\'abana mu Rwanda',
        slug: 'amafaranga-atsinzwe-ku-burezi-bw-abana-mu-rwanda',
        excerpt: 'Gahunda y\'amafaranga yo mu burezi bwabantu.',
        content: 'Icyama c\'igihugu cyatangiranye amafaranga menshi ku burezi bw\'abana. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi imihanda y\'uburezi. Umushinga utazamukora ijejo 250,000 mu nzira.',
        categoryId: undefined,
        author: 'Education Ministry',
        status: 'published',
        featured: false,
        readTime: 5,
        image: 'https://images.unsplash.com/photo-1427504494726-f74560b62989?w=800&q=80',
      },
      {
        title: 'Inzu nshya z\'amahoro mu gihembwe cyambere cya 2026',
        slug: 'inzu-nshya-z-amahoro-mu-gihembwe-cyambere-cya-2026',
        excerpt: 'Umushinga w\'inzu nshya z\'amahoro mu Rwanda.',
        content: 'Guverinoma y\'u Rwanda yashyiraho umushinga w\'umukino w\'inzu nshya z\'amahoro. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'igihugu. Inzu 1,000 zazamukora mu nzira y\'amadeni yose.',
        categoryId: undefined,
        author: 'Housing Ministry',
        status: 'published',
        featured: false,
        readTime: 6,
        image: 'https://images.unsplash.com/photo-1503387593526-f5d59cf2d4b1?w=800&q=80',
      },
      {
        title: 'Tekinoroji y\'abahanga: Inzira mpya mu Rwanda',
        slug: 'tekinoroji-y-abahanga-inzira-mpya-mu-rwanda',
        excerpt: 'Umushinga w\'ubwiyunge bw\'abahanga mu tekinoroji.',
        content: 'Imbega y\'ubushakashatsi yatangiranye umushinga w\'ubwiyunge bw\'abahanga mu tekinoroji. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwigunge. Amaresoro amenshi aratangiranye ibyo kazi mu nzira y\'igihugu.',
        categoryId: undefined,
        author: 'Science Correspondent',
        status: 'published',
        featured: false,
        readTime: 7,
        image: 'https://images.unsplash.com/photo-1633356122544-f134324ef6db?w=800&q=80',
      },
      {
        title: 'Umunyarwanda wamenyesana n\'amadeni ya tekinoroji',
        slug: 'umunyarwanda-wamenyesana-n-amadeni-ya-tekinoroji',
        excerpt: 'Ibikorwa by\'umunyarwanda mu ijambo ry\'amadeni ya tekinoroji.',
        content: 'Umunyarwanda umwe wamenyesana n\'ibindi buntu mu ijambo ry\'amadeni ya tekinoroji. Ibi byari umwaka wambere mu ijambo ry\'igihugu. Umwe muri ba profeseri banahakoze cyane.',
        categoryId: undefined,
        author: 'News Team',
        status: 'published',
        featured: false,
        readTime: 4,
        image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
      },
      {
        title: 'Imigambi y\'ubwigunge bw\'ibinyabiziga mu Rwanda',
        slug: 'imigambi-y-ubwigunge-bw-ibinyabiziga-mu-rwanda',
        excerpt: 'Gahunda y\'ubwigunge bw\'ibinyabiziga y\'umwaka wa 2026.',
        content: 'Icyama c\'igihugu cyatangiranye imigambi y\'ubwigunge bw\'ibinyabiziga. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'umusaraba. Umushinga utazamuhora abantu benshi mu Rwanda.',
        categoryId: undefined,
        author: 'Transport Ministry',
        status: 'published',
        featured: false,
        readTime: 5,
        image: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=800&q=80',
      },
      {
        title: 'Amadeni y\'ubwigunge bw\'amashuri mu Rwanda',
        slug: 'amadeni-y-ubwigunge-bw-amashuri-mu-rwanda',
        excerpt: 'Itangazo ry\'amadeni y\'ubwigunge bw\'amashuri.',
        content: 'Minisiteri y\'uburezi yatangiranye amadeni y\'ubwigunge bw\'amashuri. Ibi bikorwa bikaba intego yo kwibuka ihabwa abana benshi ubwiyunge bw\'amashuri. Amashuri 500 azamukora mu nzira y\'igihugu cy\'ubwiyunge.',
        categoryId: undefined,
        author: 'Education Reporter',
        status: 'published',
        featured: false,
        readTime: 6,
        image: 'https://images.unsplash.com/photo-1427504494726-f74560b62989?w=800&q=80',
      },
      {
        title: 'Iyobokamana y\'abagore mu Rwanda: Ibiciro by\'igihingu',
        slug: 'iyobokamana-y-abagore-mu-rwanda-ibiciro-by-igihingu',
        excerpt: 'Umushinga w\'iyobokamana y\'abagore mu Rwanda.',
        content: 'APR FC n\'inzira nshya y\'iyobokamana y\'abagore mu Rwanda yatangiye. Ibi bikorwa bikaba intego yo kwibuka ihabwa abagore ubwiyunge bw\'iyobokamana. Itangazo ry\'amarushanwa yumwaka uzakoma mu ndidirisha.',
        categoryId: undefined,
        author: 'Sports Editor',
        status: 'published',
        featured: false,
        readTime: 5,
        image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80',
      },
      {
        title: 'Ubushakashatsi bw\'ubwigunge bw\'ibiti mu Rwanda',
        slug: 'ubushakashatsi-bw-ubwigunge-bw-ibiti-mu-rwanda',
        excerpt: 'Imbega y\'ubushakashatsi yatangiranye ubushakashatsi bushya bw\'ibiti.',
        content: 'Ubushakashatsi bushya bwabusubusu ubwigunge bw\'ibiti mu Rwanda. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwigunge bw\'ikirehe. Amaresoro azo mahiguriranye 500 abarwandi.',
        categoryId: undefined,
        author: 'Environmental Reporter',
        status: 'published',
        featured: false,
        readTime: 7,
        image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80',
      },
      {
        title: 'Amadeni y\'intarineti mu Rwanda: Ibiciro by\'igihingu',
        slug: 'amadeni-y-intarineti-mu-rwanda-ibiciro-by-igihingu',
        excerpt: 'Gahunda y\'amadeni y\'intarineti mu Rwanda.',
        content: 'Icyama c\'igihugu cyatangiranye amadeni y\'intarineti mu Rwanda. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'intarineti. Umushinga utazamuhora abantu 3 miliyoni mu nzira imwe.',
        categoryId: undefined,
        author: 'Tech Editor',
        status: 'published',
        featured: false,
        readTime: 6,
        image: 'https://images.unsplash.com/photo-1633356122544-f134324ef6db?w=800&q=80',
      },
      {
        title: 'Ubuzima bw\'akarere k\'ingezigezi mu Rwanda',
        slug: 'ubuzima-bw-akarere-k-ingezigezi-mu-rwanda',
        excerpt: 'Itangazo ry\'ubuzima bw\'akarere k\'ingezigezi.',
        content: 'Minisiteri y\'ubuzima yatangiranye ubuzima bw\'akarere k\'ingezigezi mu Rwanda. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'ubuzima. Amafaranga azo mahiguriranye 1 miliyoni mu nzira y\'igihingu.',
        categoryId: undefined,
        author: 'Health Correspondent',
        status: 'published',
        featured: false,
        readTime: 5,
        image: 'https://images.unsplash.com/photo-1576091160550-112173f7f869?w=800&q=80',
      },
      {
        title: 'Inzira mpya y\'ubigenerezamuntu mu Rwanda',
        slug: 'inzira-mpya-y-ubigenerezamuntu-mu-rwanda',
        excerpt: 'Gahunda y\'ubwigunge bw\'ubigenerezamuntu.',
        content: 'Icyama c\'igihugu cyatangiranye inzira mpya y\'ubigenerezamuntu mu Rwanda. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge. Umushinga utazamuhora abantu 500,000 mu nzira y\'amadeni.',
        categoryId: undefined,
        author: 'Community Correspondent',
        status: 'published',
        featured: false,
        readTime: 6,
        image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
      },
      {
        title: 'Imyidagaduro y\'inzira n\'amadeni y\'igihingu mu Rwanda',
        slug: 'imyidagaduro-y-inzira-n-amadeni-y-igihingu-mu-rwanda',
        excerpt: 'Umushinga w\'imyidagaduro y\'inzira nshya.',
        content: 'Icyama c\'igihugu cyatangiranye imyidagaduro y\'inzira nshya mu Rwanda. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'imvugo. Amaresoro azo mahiguriranye 2 miliyoni mu nzira y\'igihingu.',
        categoryId: undefined,
        author: 'Culture Editor',
        status: 'published',
        featured: true,
        readTime: 7,
        image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80',
      },
      {
        title: 'Politiki n\'ubwiyunge bw\'abaturage mu Rwanda',
        slug: 'politiki-n-ubwiyunge-bw-abaturage-mu-rwanda-2',
        excerpt: 'Ikiganiro cy\'ubwiyunge bw\'abaturage mu politiki y\'u Rwanda.',
        content: 'Icyama c\'igihugu cyatangiranye ubwiyunge bw\'abaturage mu politiki. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'igihugu. Umunyarwanda 1 miliyoni azatangira igiciro cy\'ubwiyunge.',
        categoryId: undefined,
        author: 'Political Editor',
        status: 'published',
        featured: false,
        readTime: 8,
        image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
      },
      {
        title: 'Tekinoroji n\'ubwigunge bw\'agriculturee mu Rwanda',
        slug: 'tekinoroji-n-ubwigunge-bw-agriculturee-mu-rwanda',
        excerpt: 'Umushinga w\'ubwigunge bw\'ibihumbi mu Rwanda.',
        content: 'Icyama c\'igihugu cyatangiranye tekinoroji y\'ubwigunge bw\'ibihumbi mu Rwanda. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'imvugo. Umushinga utazamuhora 100,000 mu nzira y\'agriteshi.',
        categoryId: undefined,
        author: 'Agriculture Correspondent',
        status: 'published',
        featured: false,
        readTime: 7,
        image: 'https://images.unsplash.com/photo-1500669359606-cf4fa3b80f5f?w=800&q=80',
      },
      {
        title: 'Ubuzima bw\'abakozi mu Rwanda mu mwaka wa 2026',
        slug: 'ubuzima-bw-abakozi-mu-rwanda-mu-mwaka-wa-2026',
        excerpt: 'Gahunda y\'ubuzima bw\'abakozi mu Rwanda.',
        content: 'Icyama c\'igihugu cyatangiranye ubuzima bw\'abakozi mu Rwanda. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'akazi. Amafaranga azo mahiguriranye 500 miliyoni mu nzira y\'ubukozi.',
        categoryId: undefined,
        author: 'Labor Reporter',
        status: 'published',
        featured: false,
        readTime: 6,
        image: 'https://images.unsplash.com/photo-1589939705066-5a101c565f0f?w=800&q=80',
      },
      {
        title: 'Inzira y\'ubwigunge bw\'amafoto mu Rwanda',
        slug: 'inzira-y-ubwigunge-bw-amafoto-mu-rwanda',
        excerpt: 'Umushinga w\'ubwigunge bw\'amafoto n\'ibihumbi.',
        content: 'Imbega y\'ubushakashatsi yatangiranye ubwigunge bw\'amafoto mu Rwanda. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'imvugo. Ari mu nzira y\'busabizi bwa tekinoroji.',
        categoryId: undefined,
        author: 'Tech Correspondent',
        status: 'published',
        featured: false,
        readTime: 5,
        image: 'https://images.unsplash.com/photo-1633356122544-f134324ef6db?w=800&q=80',
      },
      {
        title: 'Amaresoro y\'ibinyarwanda mu gihembwe cyambere cya 2026',
        slug: 'amaresoro-y-ibinyarwanda-mu-gihembwe-cyambere-cya-2026',
        excerpt: 'Itangazo ry\'amaresoro y\'umwaka wa 2026.',
        content: 'Icyama c\'igihugu cyatangiranye amaresoro y\'ibinyarwanda mu gihembwe cyambere. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'igihugu. Amafaranga azo mahiguriranye 10 miliyoni mu nzira.',
        categoryId: undefined,
        author: 'Economy Reporter',
        status: 'published',
        featured: false,
        readTime: 6,
        image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
      },
      {
        title: 'Ubushakashatsi bw\'ubwigunge bw\'ubwiyunge mu Rwanda',
        slug: 'ubushakashatsi-bw-ubwigunge-bw-ubwiyunge-mu-rwanda',
        excerpt: 'Imbega y\'ubushakashatsi yatangiranye ubushakashatsi bushya.',
        content: 'Ubushakashatsi bushya babusubusu ubwiyunge bw\'ubwigunge mu Rwanda. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwigunge bw\'igihugu. Amaresoro azo mahiguriranye 2 miliyoni mu nzira y\'ubushakashatsi.',
        categoryId: undefined,
        author: 'Research Reporter',
        status: 'published',
        featured: false,
        readTime: 7,
        image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80',
      },
      {
        title: 'Amadeni y\'ubwigunge bw\'inyumba mu Rwanda',
        slug: 'amadeni-y-ubwigunge-bw-inyumba-mu-rwanda',
        excerpt: 'Gahunda y\'amadeni y\'ubwigunge bw\'inyumba.',
        content: 'Icyama c\'igihugu cyatangiranye amadeni y\'ubwigunge bw\'inyumba mu Rwanda. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'abantu. Inzu 10,000 zazamukora mu nzira y\'umwaka.',
        categoryId: undefined,
        author: 'Housing Correspondent',
        status: 'published',
        featured: false,
        readTime: 5,
        image: 'https://images.unsplash.com/photo-1503387593526-f5d59cf2d4b1?w=800&q=80',
      },
      {
        title: 'Tekinoroji y\'amazi mu Rwanda: Ibiciro by\'igihingu',
        slug: 'tekinoroji-y-amazi-mu-rwanda-ibiciro-by-igihingu',
        excerpt: 'Umushinga w\'ubwigunge bw\'amazi nshya.',
        content: 'Icyama c\'igihugu cyatangiranye tekinoroji y\'amazi nshya mu Rwanda. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'umazi. Umushinga utazamuhora 2 miliyoni mu nzira y\'abantu.',
        categoryId: undefined,
        author: 'Environment Correspondent',
        status: 'published',
        featured: false,
        readTime: 6,
        image: 'https://images.unsplash.com/photo-1508747703527-da58267ca4e0?w=800&q=80',
      },
      {
        title: 'Ubuzima bw\'ubguzi mu Rwanda mu mwaka wa 2026',
        slug: 'ubuzima-bw-ubguzi-mu-rwanda-mu-mwaka-wa-2026',
        excerpt: 'Itangazo ry\'ubuzima bw\'ubguzi mu Rwanda.',
        content: 'Minisiteri y\'ubuzima yatangiranye ubuzima bw\'ubguzi mu Rwanda mu mwaka wa 2026. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'ubuzima. Amashuri 1,000 azamukora mu nzira y\'ubwiyunge.',
        categoryId: undefined,
        author: 'Health Editor',
        status: 'published',
        featured: false,
        readTime: 7,
        image: 'https://images.unsplash.com/photo-1576091160550-112173f7f869?w=800&q=80',
      },
    ];

    // Get all categories first
    const categoryMap = await prisma.category.findMany();
    const categoryBySlug = Object.fromEntries(
      categoryMap.map(cat => [cat.slug, cat.id])
    );

    // Assign categories to articles
    const categoryAssignment: Record<number, string> = {
      0: 'amakuru', // Breaking news
      1: 'politiki', // Politics
      2: 'ubuzima', // Health
      3: 'uburezi', // Education
      4: 'ubukungu', // Business
      5: 'ikoranabuhanga', // Technology
      6: 'imyidagaduro', // Culture
      7: 'imyidagaduro', // Culture
      8: 'ubushakashatsi', // Investigations
      9: 'ubuzima', // Health
      10: 'politiki', // Politics
      11: 'politiki', // Politics
      12: 'ikoranabuhanga', // Technology
      13: 'imyidagaduro', // Culture
      14: 'ubushakashatsi', // Investigations
      15: 'ubushakashatsi', // Investigations
      16: 'ubuzima', // Health
      17: 'ubuzima', // Health
      18: 'ikoranabuhanga', // Technology
      19: 'ubuzima', // Health
      20: 'imyidagaduro', // Culture
      21: 'politiki', // Politics
      22: 'ikoranabuhanga', // Technology
      23: 'ubukungu', // Business
      24: 'ubushakashatsi', // Investigations
      25: 'ikoranabuhanga', // Technology
      26: 'ubukungu', // Business
      27: 'ubuzima', // Health
      28: 'ikoranabuhanga', // Technology
      29: 'ubuzima', // Health
      30: 'uburezi', // Education
    };

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const categorySlug = categoryAssignment[i] || 'amakuru';
      const categoryId = categoryBySlug[categorySlug];

      if (categoryId) {
        const existingArticle = await prisma.article.findUnique({
          where: { slug: article.slug },
        });

        if (!existingArticle) {
          const createdArticle = await prisma.article.create({
            data: {
              title: article.title,
              slug: article.slug,
              excerpt: article.excerpt,
              content: article.content,
              categoryId: categoryId,
              author: article.author,
              status: article.status,
              featured: article.featured,
              readTime: article.readTime,
              image: article.image,
              publishedAt: new Date(),
            },
          });
          console.log(`✅ Article created: ${createdArticle.title}`);
        }
      }
    }

    console.log('🎉 Seeding complete!');
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.log('⚠️  Admin user already exists');
    } else {
      throw error;
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
