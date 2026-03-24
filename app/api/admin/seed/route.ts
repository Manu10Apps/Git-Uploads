import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Create categories
    const categories =[ 
      { name: 'Amakuru', slug: 'amakuru', description: 'Breaking News' },
      { name: 'Politiki', slug: 'politiki', description: 'Politics' },
      { name: 'Ubuzima', slug: 'ubuzima', description: 'Health' },
      { name: 'Uburezi', slug: 'uburezi', description: 'Education' },
      { name: 'Ubukungu', slug: 'ubukungu', description: 'Business & Economy' },
      { name: 'Ikoranabuhanga', slug: 'ikoranabuhanga', description: 'Technology' },
      { name: 'Imyidagaduro', slug: 'imyidagaduro', description: 'Culture & Entertainment' },
      { name: 'Ubushakashatsi', slug: 'ubushakashatsi', description: 'Investigations & Analysis' },
    ];

    const categoryMap: Record<string, number> = {};
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
        categoryMap[cat.slug] = category.id;
      } else {
        categoryMap[cat.slug] = existing.id;
      }
    }

    // Create articles
    const articles = [
      {
        title: 'Ubwigunge bw\'u Rwanda mu gihe cy\'amadeni',
        slug: 'ubwigunge-bu-rwanda-mu-gihe-cy-amadeni',
        excerpt: 'Iki kiganiro gikubiyemo ubwigunge n\'ubwenge bw\'u Rwanda mu gihe cy\'amadeni ya tekinoroji.',
        content: 'U Rwanda rwakemuka neza mu nzira y\'ubwigunge bwa tekinoroji. Umushinga w\'Igihugu wa tekinoroji wazamuye abantu benshi n\'akamuhanda ka digitale. Ibi bikorwa byatangiye mu mwaka wa 2020 kandi ubwigunge bwacu bwakomeje kumiyukira.',
        category: 'amakuru',
        author: 'Amakuru Team',
      },
      {
        title: 'Politiki y\'ingeri y\'abaturage mu Rwanda',
        slug: 'politiki-y-ingeri-y-abaturage-mu-rwanda',
        excerpt: 'Inzira mpya y\'ubwiyunge bw\'abaturage mu gihugu cy\'u Rwanda.',
        content: 'Guverinoma y\'u Rwanda yashyiraho politiki mpya yo mu burezi bw\'abaturage. Izi politiki zikamuhirangira abantu benshi n\'akamuhanda ka democracy. Umushinga w\'igihugu waharanira amahoro n\'ubwiyunge bw\'abaturage.',
        category: 'politiki',
        author: 'John Hoza',
      },
      {
        title: 'Ubuzima bw\'abana mu Rwanda: Ibyo biteganyije mu 2026',
        slug: 'ubuzima-bw-abana-mu-rwanda-ibyo-biteganyije',
        excerpt: 'Gahunda nshya y\'ubuzima bw\'abana mu Rwanda.',
        content: 'Minisiteri y\'ubuzima yarahaye umushinga w\'ubuzima bw\'abana mu nzira y\'ubwiyunge. Ibi bikorwa birazamuhora indwara y\'ubwubunu n\'ibindi birwaye. Umushinga utazamuhora abantu 100,000 mu Rwanda.',
        category: 'ubuzima',
        author: 'Dr. Marie Mukantira',
      },
      {
        title: 'Uburezi bu nzira mpya mu mateka ya Rwanda',
        slug: 'uburezi-bu-nzira-mpya-mu-mateka-ya-rwanda',
        excerpt: 'Inzira mpya y\'uburezi mu mateka n\'ubwiyunge bw\'igihugu.',
        content: 'Ingoro y\'uburezi mu Rwanda yashyiraho inzira mpya yo mu mateka y\'igihugu. Ibi bikorwa bikaba intego yo kwibuka ihabwa abana n\'abagore bose. Umushinga utazamuteza inzira y\'ubwiyunge bw\'igihugu.',
        category: 'uburezi',
        author: 'Prof. Emmanuel Gasaro',
      },
      {
        title: 'Ubukungu bw\'u Rwanda bushyikana mu ijabo',
        slug: 'ubukungu-bw-u-rwanda-bushyikana-mu-ijabo',
        excerpt: 'Igaramire y\'ubukungu bw\'u Rwanda mu gihembwe cyambere cya 2026.',
        content: 'Banki y\'igihugu yaratangiye igihonde cy\'ubukungu mu gihembwe cyambere. Ubukungu bw\'u Rwanda bushyikana mu igipimo cy\'amafaranga ku buri munyarwanda. Ibi bikorwa bisigira ingero y\'ubwiyunge bw\'abantu.',
        category: 'ubukungu',
        author: 'Alphonse Kagina',
      },
      {
        title: 'Tekinoroji nshya y\'intarineti mu Rwanda',
        slug: 'tekinoroji-nshya-y-intarineti-mu-rwanda',
        excerpt: 'Umushinga w\'intarineti inzira nshya mu nzira y\'igihugu.',
        content: 'Umushinga w\'intarineti y\'inzira nshya wazamuteza abageni benshi mu cyahoze cyari kigihugu. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu bose imihanda y\'intarineti. Umushinga utazamuhora abantu 5 miliyoni mu Rwanda.',
        category: 'ikoranabuhanga',
        author: 'Tech Team Rwanda',
      },
      {
        title: 'Imyidagaduro y\'u Rwanda: Igihembe cy\'amadeni',
        slug: 'imyidagaduro-y-u-rwanda-igihembe-cy-amadeni',
        excerpt: 'Ubwiyunge bw\'imyidagaduro mu Rwanda mu gihembwe cy\'amadeni.',
        content: 'Ibikorwa by\'imyidagaduro mu Rwanda byatangiye ku mwaka w\'amadeni yishize. Umushinga w\'ubwiyunge bw\'ubugeni n\'imvugo wazamuteza intera y\'ubwigunge. Ibi ntibyari bikunze mu ijambo rya Rwanda ryose.',
        category: 'imyidagaduro',
        author: 'Arts Rwanda',
      },
      {
        title: 'Iyobokamana mu Rwanda: Amarushanwa nshya ya APR FC',
        slug: 'iyobokamana-mu-rwanda-amarushanwa-nshya-ya-apr-fc',
        excerpt: 'APR FC yatsinzire umukino w\'iyobokamana mu Rwanda.',
        content: 'APR FC yatsinzire umukino w\'umukinnyi w\'iyobokamana mu cyahoze kirarwaye. Umwami w\'iyi mikino yakagize umwanya mwiza mu ijambo rya iyobokamana. Ibi byari umwaka wambere Yambere mu ijambo ry\'igihugu.',
        category: 'imyidagaduro',
        author: 'Sports Correspondent',
      },
      {
        title: 'Bushakashatsi: Ubwiyunge bw\'ubugeni mu gihe cy\'amadeni',
        slug: 'bushakashatsi-ubwiyunge-bw-ubugeni-mu-gihe-cy-amadeni',
        excerpt: 'Ubushakashatsi bushya bubusubusu ubwiyunge bw\'ubugeni mu Rwanda.',
        content: 'Imbega y\'ubushakashatsi y\'igihugu yarashyiraho umushinga w\'ubushakashatsi bushya. Ibi bikorwa bikaba intego yo kwihana ubwiyunge bw\'ubugeni mu gihe cy\'amadeni. Abashakashatsi 50 baratangije ibyo kazi mu nzira mpya.',
        category: 'ubushakashatsi',
        author: 'Dr. Vincent Muvandi',
      },
      {
        title: 'Urwanya rw\'indwara y\'ubwubunu mu Rwanda',
        slug: 'urwanya-rw-indwara-y-ubwubunu-mu-rwanda',
        excerpt: 'Ubwigenge bw\'igihugu bukampira indwara y\'ubwubunu.',
        content: 'Minisiteri y\'ubuzima yatangiye umushinga w\'urwanya rw\'indwara y\'ubwubunu. Iki kiganiro gikubiyemo ubwiyunge bw\'ubugeni n\'ubwigunge bw\'igihugu cyose. Amafaranga azo mahiguriranye amaraso y\'abantu 100,000 mu Rwanda.',
        category: 'ubuzima',
        author: 'Dr. Justine Kizito',
      },
      {
        title: 'Imigambi y\'igihugu itari mu nyungu y\'abantu benshi',
        slug: 'imigambi-y-igihugu-itari-mu-nyungu-y-abantu-benshi',
        excerpt: 'Itangazo ry\'imigambi y\'igihugu mu 2026.',
        content: 'Guverinoma y\'u Rwanda yatangiye imigambi y\'igihugu itari mu nyungu y\'abantu benshi. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'igihugu. Umushinga utazamuhora miliyoni y\'abarwandi.',
        category: 'politiki',
        author: 'Political Analyst',
      },
      {
        title: 'Amafaranga atsinzwe ku burezi bw\'abana mu Rwanda',
        slug: 'amafaranga-atsinzwe-ku-burezi-bw-abana-mu-rwanda',
        excerpt: 'Gahunda y\'amafaranga yo mu burezi bwabantu.',
        content: 'Icyama c\'igihugu cyatangiranye amafaranga menshi ku burezi bw\'abana. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi imihanda y\'uburezi. Umushinga utazamukora ijejo 250,000 mu nzira.',
        category: 'uburezi',
        author: 'Education Ministry',
      },
      {
        title: 'Inzu nshya z\'amahoro mu gihembwe cyambere cya 2026',
        slug: 'inzu-nshya-z-amahoro-mu-gihembwe-cyambere-cya-2026',
        excerpt: 'Umushinga w\'inzu nshya z\'amahoro mu Rwanda.',
        content: 'Guverinoma y\'u Rwanda yashyiraho umushinga w\'umukino w\'inzu nshya z\'amahoro. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'igihugu. Inzu 1,000 zazamukora mu nzira y\'amadeni yose.',
        category: 'politiki',
        author: 'Housing Ministry',
      },
      {
        title: 'Tekinoroji y\'abahanga: Inzira mpya mu Rwanda',
        slug: 'tekinoroji-y-abahanga-inzira-mpya-mu-rwanda',
        excerpt: 'Umushinga w\'ubwiyunge bw\'abahanga mu tekinoroji.',
        content: 'Imbega y\'ubushakashatsi yatangiranye umushinga w\'ubwiyunge bw\'abahanga mu tekinoroji. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwigunge. Amaresoro amenshi aratangiranye ibyo kazi mu nzira y\'igihugu.',
        category: 'ikoranabuhanga',
        author: 'Science Correspondent',
      },
      {
        title: 'Umunyarwanda wamenyesana n\'amadeni ya tekinoroji',
        slug: 'umunyarwanda-wamenyesana-n-amadeni-ya-tekinoroji',
        excerpt: 'Ibikorwa by\'umunyarwanda mu ijambo ry\'amadeni ya tekinoroji.',
        content: 'Umunyarwanda umwe wamenyesana n\'ibindi buntu mu ijambo ry\'amadeni ya tekinoroji. Ibi byari umwaka wambere mu ijambo ry\'igihugu. Umwe muri ba profeseri banahakoze cyane.',
        category: 'ikoranabuhanga',
        author: 'News Team',
      },
      {
        title: 'Imigambi y\'ubwigunge bw\'ibinyabiziga mu Rwanda',
        slug: 'imigambi-y-ubwigunge-bw-ibinyabiziga-mu-rwanda',
        excerpt: 'Gahunda y\'ubwigunge bw\'ibinyabiziga y\'umwaka wa 2026.',
        content: 'Icyama c\'igihugu cyatangiranye imigambi y\'ubwigunge bw\'ibinyabiziga. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'umusaraba. Umushinga utazamuhora abantu benshi mu Rwanda.',
        category: 'ubukungu',
        author: 'Transport Ministry',
      },
      {
        title: 'Amadeni y\'ubwigunge bw\'amashuri mu Rwanda',
        slug: 'amadeni-y-ubwigunge-bw-amashuri-mu-rwanda',
        excerpt: 'Itangazo ry\'amadeni y\'ubwigunge bw\'amashuri.',
        content: 'Minisiteri y\'uburezi yatangiranye amadeni y\'ubwigunge bw\'amashuri. Ibi bikorwa bikaba intego yo kwibuka ihabwa abana benshi ubwiyunge bw\'amashuri. Amashuri 500 azamukora mu nzira y\'igihugu cy\'ubwiyunge.',
        category: 'uburezi',
        author: 'Education Reporter',
      },
      {
        title: 'Iyobokamana y\'abagore mu Rwanda: Ibiciro by\'igihingu',
        slug: 'iyobokamana-y-abagore-mu-rwanda-ibiciro-by-igihingu',
        excerpt: 'Umushinga w\'iyobokamana y\'abagore mu Rwanda.',
        content: 'APR FC n\'inzira nshya y\'iyobokamana y\'abagore mu Rwanda yatangiye. Ibi bikorwa bikaba intego yo kwibuka ihabwa abagore ubwiyunge bw\'iyobokamana. Itangazo ry\'amarushanwa yumwaka uzakoma mu ndidirisha.',
        category: 'imyidagaduro',
        author: 'Sports Editor',
      },
      {
        title: 'Ubushakashatsi bw\'ubwigunge bw\'ibiti mu Rwanda',
        slug: 'ubushakashatsi-bw-ubwigunge-bw-ibiti-mu-rwanda',
        excerpt: 'Imbega y\'ubushakashatsi yatangiranye ubushakashatsi bushya bw\'ibiti.',
        content: 'Ubushakashatsi bushya bwabusubusu ubwigunge bw\'ibiti mu Rwanda. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwigunge bw\'ikirehe. Amaresoro azo mahiguriranye 500 abarwandi.',
        category: 'ubushakashatsi',
        author: 'Environmental Reporter',
      },
      {
        title: 'Amadeni y\'intarineti mu Rwanda: Ibiciro by\'igihingu',
        slug: 'amadeni-y-intarineti-mu-rwanda-ibiciro-by-igihingu',
        excerpt: 'Gahunda y\'amadeni y\'intarineti mu Rwanda.',
        content: 'Icyama c\'igihugu cyatangiranye amadeni y\'intarineti mu Rwanda. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'intarineti. Umushinga utazamuhora abantu 3 miliyoni mu nzira imwe.',
        category: 'ikoranabuhanga',
        author: 'Tech Editor',
      },
      {
        title: 'Ubuzima bw\'akarere k\'ingezigezi mu Rwanda',
        slug: 'ubuzima-bw-akarere-k-ingezigezi-mu-rwanda',
        excerpt: 'Itangazo ry\'ubuzima bw\'akarere k\'ingezigezi.',
        content: 'Minisiteri y\'ubuzima yatangiranye ubuzima bw\'akarere k\'ingezigezi mu Rwanda. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'ubuzima. Amafaranga azo mahiguriranye 1 miliyoni mu nzira y\'igihingu.',
        category: 'ubuzima',
        author: 'Health Correspondent',
      },
      {
        title: 'Inzira mpya y\'ubigenerezamuntu mu Rwanda',
        slug: 'inzira-mpya-y-ubigenerezamuntu-mu-rwanda',
        excerpt: 'Gahunda y\'ubwigunge bw\'ubigenerezamuntu.',
        content: 'Icyama c\'igihugu cyatangiranye inzira mpya y\'ubigenerezamuntu mu Rwanda. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge. Umushinga utazamuhora abantu 500,000 mu nzira y\'amadeni.',
        category: 'politiki',
        author: 'Community Correspondent',
      },
      {
        title: 'Imyidagaduro y\'inzira n\'amadeni y\'igihingu mu Rwanda',
        slug: 'imyidagaduro-y-inzira-n-amadeni-y-igihingu-mu-rwanda',
        excerpt: 'Umushinga w\'imyidagaduro y\'inzira nshya.',
        content: 'Icyama c\'igihugu cyatangiranye imyidagaduro y\'inzira nshya mu Rwanda. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'imvugo. Amaresoro azo mahiguriranye 2 miliyoni mu nzira y\'igihingu.',
        category: 'imyidagaduro',
        author: 'Culture Editor',
      },
      {
        title: 'Politiki n\'ubwiyunge bw\'abaturage mu Rwanda',
        slug: 'politiki-n-ubwiyunge-bw-abaturage-mu-rwanda-2',
        excerpt: 'Ikiganiro cy\'ubwiyunge bw\'abaturage mu politiki y\'u Rwanda.',
        content: 'Icyama c\'igihugu cyatangiranye ubwiyunge bw\'abaturage mu politiki. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'igihugu. Umunyarwanda 1 miliyoni azatangira igiciro cy\'ubwiyunge.',
        category: 'politiki',
        author: 'Political Editor',
      },
      {
        title: 'Tekinoroji n\'ubwigunge bw\'agriculturee mu Rwanda',
        slug: 'tekinoroji-n-ubwigunge-bw-agriculturee-mu-rwanda',
        excerpt: 'Umushinga w\'ubwigunge bw\'ibihumbi mu Rwanda.',
        content: 'Icyama c\'igihugu cyatangiranye tekinoroji y\'ubwigunge bw\'ibihumbi mu Rwanda. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'imvugo. Umushinga utazamuhora 100,000 mu nzira y\'agriteshi.',
        category: 'ikoranabuhanga',
        author: 'Agriculture Correspondent',
      },
      {
        title: 'Ubuzima bw\'abakozi mu Rwanda mu mwaka wa 2026',
        slug: 'ubuzima-bw-abakozi-mu-rwanda-mu-mwaka-wa-2026',
        excerpt: 'Gahunda y\'ubuzima bw\'abakozi mu Rwanda.',
        content: 'Icyama c\'igihugu cyatangiranye ubuzima bw\'abakozi mu Rwanda. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'akazi. Amafaranga azo mahiguriranye 500 miliyoni mu nzira y\'ubukozi.',
        category: 'ubukungu',
        author: 'Labor Reporter',
      },
      {
        title: 'Inzira y\'ubwigunge bw\'amafoto mu Rwanda',
        slug: 'inzira-y-ubwigunge-bw-amafoto-mu-rwanda',
        excerpt: 'Umushinga w\'ubwigunge bw\'amafoto n\'ibihumbi.',
        content: 'Imbega y\'ubushakashatsi yatangiranye ubwigunge bw\'amafoto mu Rwanda. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'imvugo. Ari mu nzira y\'busabizi bwa tekinoroji.',
        category: 'ikoranabuhanga',
        author: 'Tech Correspondent',
      },
      {
        title: 'Amaresoro y\'ibinyarwanda mu gihembwe cyambere cya 2026',
        slug: 'amaresoro-y-ibinyarwanda-mu-gihembwe-cyambere-cya-2026',
        excerpt: 'Itangazo ry\'amaresoro y\'umwaka wa 2026.',
        content: 'Icyama c\'igihugu cyatangiranye amaresoro y\'ibinyarwanda mu gihembwe cyambere. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'igihugu. Amafaranga azo mahiguriranye 10 miliyoni mu nzira.',
        category: 'ubukungu',
        author: 'Economy Reporter',
      },
      {
        title: 'Ubushakashatsi bw\'ubwigunge bw\'ubwiyunge mu Rwanda',
        slug: 'ubushakashatsi-bw-ubwigunge-bw-ubwiyunge-mu-rwanda',
        excerpt: 'Imbega y\'ubushakashatsi yatangiranye ubushakashatsi bushya.',
        content: 'Ubushakashatsi bushya babusubusu ubwiyunge bw\'ubwigunge mu Rwanda. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwigunge bw\'igihugu. Amaresoro azo mahiguriranye 2 miliyoni mu nzira y\'ubushakashatsi.',
        category: 'ubushakashatsi',
        author: 'Research Reporter',
      },
      {
        title: 'Amadeni y\'ubwigunge bw\'inyumba mu Rwanda',
        slug: 'amadeni-y-ubwigunge-bw-inyumba-mu-rwanda',
        excerpt: 'Gahunda y\'amadeni y\'ubwigunge bw\'inyumba.',
        content: 'Icyama c\'igihugu cyatangiranye amadeni y\'ubwigunge bw\'inyumba mu Rwanda. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'abantu. Inzu 10,000 zazamukora mu nzira y\'umwaka.',
        category: 'ubukungu',
        author: 'Housing Correspondent',
      },
      {
        title: 'Tekinoroji y\'amazi mu Rwanda: Ibiciro by\'igihingu',
        slug: 'tekinoroji-y-amazi-mu-rwanda-ibiciro-by-igihingu',
        excerpt: 'Umushinga w\'ubwigunge bw\'amazi nshya.',
        content: 'Icyama c\'igihugu cyatangiranye tekinoroji y\'amazi nshya mu Rwanda. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'umazi. Umushinga utazamuhora 2 miliyoni mu nzira y\'abantu.',
        category: 'ikoranabuhanga',
        author: 'Environment Correspondent',
      },
      {
        title: 'Ubuzima bw\'ubguzi mu Rwanda mu mwaka wa 2026',
        slug: 'ubuzima-bw-ubguzi-mu-rwanda-mu-mwaka-wa-2026',
        excerpt: 'Itangazo ry\'ubuzima bw\'ubguzi mu Rwanda.',
        content: 'Minisiteri y\'ubuzima yatangiranye ubuzima bw\'ubguzi mu Rwanda mu mwaka wa 2026. Ibi bikorwa bikaba intego yo kwibuka ihabwa abantu benshi ubwiyunge bw\'ubuzima. Amashuri 1,000 azamukora mu nzira y\'ubwiyunge.',
        category: 'ubuzima',
        author: 'Health Editor',
      },
    ];

    let created = 0;
    for (const article of articles) {
      const categoryId = categoryMap[article.category];
      if (categoryId) {
        const existing = await prisma.article.findUnique({
          where: { slug: article.slug },
        });

        if (!existing) {
          await prisma.article.create({
            data: {
              title: article.title,
              slug: article.slug,
              excerpt: article.excerpt,
              content: article.content,
              categoryId: categoryId,
              author: article.author,
              status: 'published',
              featured: Math.random() > 0.8,
              readTime: Math.floor(Math.random() * 10) + 4,
              publishedAt: new Date(),
            },
          });
          created++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeding complete! Created ${created} articles.`,
      articlesCreated: created,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Seeding failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
