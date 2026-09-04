// State Management for Client Uploads & Viewer
let uploadedPages = [];
let currentPageIndex = 0;

// URL query parameters
const urlParams = new URLSearchParams(window.location.search);

// Global State
const state = {
  currentEdition: urlParams.get('edition') || 'jalna_main',
  currentDate: urlParams.get('date') || '2026-09-04',
  currentPage: 1,
  totalPages: 6,
  zoomLevel: 1.0,
  minZoom: 0.6,
  maxZoom: 2.5,
  isCropping: false,
  cropStart: null,
  cropCurrent: null,
  cropSelection: null,
  theme: localStorage.getItem('loksarthak_theme') || 'light',
  speechSynthesisActive: false,
  isPanning: false,
  panStart: { x: 0, y: 0 },
  panOffset: { x: 0, y: 0 },
  loadedEpaperData: null,
  pdfDoc: null
};

// PDF.js worker setup for native PDF rendering
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Regional Editions Metadata
const EDITIONS = {
  jalna_main: { name: 'जालना मुख्य आवृत्ती', subtitle: 'जालना शहर व जिल्हा', pages: 6 },
  bhokardan: { name: 'भोकरदन - जाफ्राबाद', subtitle: 'तालुका विशेष पुरवणी', pages: 4 },
  partur: { name: 'परतूर - मंठा विशेष', subtitle: 'दक्षिण जालना वार्ता', pages: 4 },
  ambad: { name: 'अंबड - घनसावंगी', subtitle: 'गोदाकाठ विशेष', pages: 4 },
  badnapur: { name: 'बदनापूर परिसर', subtitle: 'स्थानिक विकास वार्ता', pages: 4 },
  marathwada: { name: 'मराठवाडा एक्सप्रेस', subtitle: 'विभागीय महा-आवृत्ती', pages: 8 }
};

// Comprehensive Marathi Newspaper Content for Pages 1 to 6
const EPAPER_DATABASE = {
  pages: {
    1: {
      title: 'मुख्य पृष्ठ (Front Page)',
      subtitle: 'जालना व मराठवाडा ठळक घडामोडी',
      stories: [
        {
          id: 'p1_s1',
          headline: 'जालना-नांदेड समृद्धी महामार्गाच्या कामाला वेग; मराठवाड्याच्या विकासाला नवी दिशा',
          category: 'विकास प्रकल्प / ठळक बातमी',
          summary: 'जालना ते नांदेड द्रुतगती महामार्गाच्या भुसंपादन व रस्ता रुंदीकरणाला गती मिळाली असून २०२७ पर्यंत काम पूर्ण करण्याचे उद्दिष्ट निश्चित करण्यात आले आहे.',
          content: `जालना (विशेष प्रतिनिधी) :\nमराठवाड्याच्या औद्योगिक व कृषी प्रगतीला नवी गती देणाऱ्या जालना-नांदेड समृद्धी महामार्ग जोड प्रकल्पाच्या कामाला प्रशासकीय पातळीवर प्रचंड वेग आला आहे.\n\nजिल्हाधिकारी कार्यालयात झालेल्या उच्चस्तरीय आढावा बैठकीत अधिकाऱ्यांनी माहिती दिली की, पहिल्या टप्प्यातील बहुतांश भूसंपादन पूर्ण झाले असून कंत्राटदारांना कार्यारंभ आदेश देण्यात आले आहेत. या महामार्गामुळे जालना, परभणी आणि नांदेड या तिन्ही जिल्ह्यांमधील प्रवास वेळ अवघ्या २ तासांवर येणार आहे.\n\nस्थानिक स्टील उद्योग आणि कृषी प्रक्रिया उद्योगांना मुंबई व जेएनपीटी बंदराशी थेट जोडणी मिळणार असल्याने जालन्याच्या औद्योगिक पट्यात कोट्यवधी रुपयांची नवी गुंतवणूक येण्याची शक्यता वर्तवली जात आहे. स्थानिक शेतकऱ्यांना मोबदला थेट बँक खात्यात वितरित केला जात आहे.`,
          rect: { x: 20, y: 140, w: 560, h: 360 },
          image: 'assets/story1.jpg',
          author: 'विशेष वृत्तसेवा, जालना'
        },
        {
          id: 'p1_s2',
          headline: 'जालना स्टील व सिडको औद्योगिक वसाहतीत ५०० कोटींची नवी गुंतवणूक',
          category: 'उद्योग / व्यापार',
          summary: 'अनेक नामांकित कंपन्यांकडून जालन्यात नवीन सौर ऊर्जा प्रकल्प व अत्याधुनिक रोलिंग मिल उभारणीचा प्रस्ताव मंजूर.',
          content: `जालना :\nदेशात स्टीलची राजधानी म्हणून ओळखल्या जाणाऱ्या जालना औद्योगिक वसाहतीत नव्या हरित तंत्रज्ञानावर आधारित ५०० कोटी रुपयांचे प्रकल्प उभारले जाणार आहेत.\n\nएमआयडीसी प्रशासनाने अतिरिक्त ५० एकर भूखंडाचे वाटप अंतिम केले असून यामुळे स्थानिक युवकांना सुमारे ३५०० थेट व अप्रत्यक्ष रोजगार उपलब्ध होणार आहेत. प्रदूषण नियंत्रण नियमांचे काटेकोर पालन करणाऱ्या अत्याधुनिक झिरो-कार्बन युनिट्सना विशेष सवलत जाहीर करण्यात आली आहे.`,
          rect: { x: 600, y: 140, w: 280, h: 360 },
          image: null,
          author: 'व्यापार प्रतिनिधी'
        },
        {
          id: 'p1_s3',
          headline: 'जायकवाडी धरणातून जालन्यासाठी अतिरिक्त आवर्तन सोडण्याचा निर्णय',
          category: 'जलसंपदा / सिंचन',
          summary: 'पाणीपुरवठा सुरळीत करण्यासाठी जलसंपदा विभागाचे आदेश; शहराचा पाणी प्रश्न सुटण्यास मोठा दिलासा.',
          content: `जालना :\nजालना शहर व परिसरातील पाणीपुरवठा अधिक सक्षम करण्यासाठी जायकवाडी धरणाच्या डाव्या कालव्यातून पाणी सोडण्याचा निर्णय जलसंपदा विभागाने घेतला आहे.\n\nयामुळे जालन्यातील घनसावंगी, अंबड व शहर पाणीपुरवठा योजनांना मुबलक पाणी उपलब्ध होईल. पालिका प्रशासनाने पाणी गळती रोखण्यासाठी विशेष पथके तैनात केली आहेत.`,
          rect: { x: 20, y: 520, w: 420, h: 280 },
          image: null,
          author: 'जिल्हा प्रतिनिधी'
        },
        {
          id: 'p1_s4',
          headline: 'मोसंबी संशोधन केंद्रात आधुनिक 'क्लायमेट-स्मार्ट' तंत्रज्ञानाचा प्रारंभ',
          category: 'कृषी तंत्रज्ञान',
          summary: 'बदलत्या हवामानात मोसंबीचे उत्पादन वाढवण्यासाठी शास्त्रज्ञांनी विकसित केली नवी संकरित जात.',
          content: `जालना :\nजालना येथील राष्ट्रीय मोसंबी संशोधन केंद्रात कमी पाण्यात अधिक उत्पादन देणाऱ्या व कीड-रोग प्रतिकारक मोसंबी रोपांचे वितरण शेतकर्‍यांसाठी सुरू झाले आहे. शास्त्रज्ञांनी फळगळ रोखण्यासाठी विशेष जैविक उपाययोजनांची प्रात्यक्षिके शेतकऱ्यांना दिली.`,
          rect: { x: 460, y: 520, w: 420, h: 280 },
          image: null,
          author: 'कृषी वार्ताहर'
        },
        {
          id: 'p1_s5',
          headline: 'जालना जिल्हा बँकेच्या सर्व शाखांमध्ये डिजिटल युपीआय व क्यूआर सेवा कार्यान्वित',
          category: 'बँकिंग / अर्थविश्व',
          summary: 'ग्रामीण शेतकऱ्यांना घरबसल्या कर्ज व बचत खाते हाताळता येणार; अत्याधुनिक ॲपचे उद्घाटन.',
          content: `जालना :\nजिल्हा मध्यवर्ती सहकारी बँकेने शेतकऱ्यांच्या सोयीसाठी सर्व शाखांमध्ये अत्याधुनिक डिजिटल बँकिंग आणि क्यूआर पेमेंट प्रणाली सुरू केली आहे. यामुळे दूध उत्पादक व शेतकरी बांधवांना थेट खात्यात पेमेंट मिळणे सुलभ झाले आहे.`,
          rect: { x: 20, y: 820, w: 860, h: 200 },
          image: null,
          author: 'अर्थ विशेष'
        }
      ]
    },
    2: {
      title: 'जालना शहर व जिल्हा (Jalna City & District)',
      subtitle: 'स्थानिक नागरी समस्या, महापालिका व गुन्हे वार्ता',
      stories: [
        {
          id: 'p2_s1',
          headline: 'जालना नगरपालिकेचे महापालिकेत रूपांतर: प्रारूप आराखड्याला अंतिम मंजुरी',
          category: 'नागरी प्रशासन',
          summary: 'शहराच्या वाढत्या लोकसंख्येला पायाभूत सुविधा देण्यासाठी शासनाकडून विशेष विकास निधीचे वाटप.',
          content: `जालना :\nजालना शहराचा चौफेर विस्तार लक्षात घेऊन महानगरपालिका स्थापनेच्या प्रारूप आराखड्याला राज्य शासनाने मंजुरी दिली आहे. यामुळे शहरातील रस्ते, ड्रेनेज, घनकचरा व्यवस्थापन आणि पथदिवे या मूलभूत सुविधांसाठी ५०० कोटींचे विशेष पॅकेज उपलब्ध होणार आहे.`,
          rect: { x: 20, y: 140, w: 430, h: 380 },
          author: 'नगर वार्ताहर'
        },
        {
          id: 'p2_s2',
          headline: 'जुना जालना व नवीन जालना उड्डाणपुलाचे काम अंतिम टप्प्यात',
          category: 'वाहतूक सुधारणा',
          summary: 'रेल्वे क्रॉसिंगवरील वाहतूक कोंडी कायमस्वरूपी सुटणार; पुढील महिन्यात लोकार्पण सोहळा.',
          content: `जालना :\nजुना व नवा जालन्याला जोडणाऱ्या उड्डाणपुलाचे गर्डर बसवण्याचे काम यशस्वीरित्या पूर्ण झाले आहे. पुढील महिन्यात हा पूल जनतेच्या सेवेत दाखल होणार असून शहरातील वाहतूक अधिक सुलभ होईल.`,
          rect: { x: 470, y: 140, w: 410, h: 380 },
          author: 'विशेष प्रतिनिधी'
        },
        {
          id: 'p2_s3',
          headline: 'जालना पोलिसांची धडक कारवाई: आंतरजिल्हा टोळी जेरबंद, मुद्देमाल हस्तगत',
          category: 'क्राईम डायरी',
          summary: 'स्थानिक गुन्हे शाखेची कारवाई; चोरीच्या १० महागड्या दुचाकी व सोने जप्त.',
          content: `जालना :\nजालना स्थानिक गुन्हे शाखेच्या पथकाने गुप्त माहितीच्या आधारे कारवाई करत घरफोड्या करणाऱ्या आंतरजिल्हा टोळीला जेरबंद केले. आरोपींकडून लाखोंचा मुद्देमाल जप्त करण्यात आला आहे.`,
          rect: { x: 20, y: 540, w: 860, h: 300 },
          author: 'गुन्हे वार्ताहर'
        }
      ]
    },
    3: {
      title: 'मराठवाडा विशेष (Marathwada Regional)',
      subtitle: 'छत्रपती संभाजीनगर, बीड, परभणी, नांदेड व धाराशीव विशेष वृत्त',
      stories: [
        {
          id: 'p3_s1',
          headline: 'मराठवाडा वॉटर ग्रीडला चालना; गोदावरी खोऱ्यातील अतिरिक्त पाणी जालन्यात आणणार',
          category: 'विभागीय पाणी प्रकल्प',
          summary: 'दुष्काळमुक्तीसाठी आखण्यात आलेल्या महत्त्वाकांक्षी वॉटरग्रीड प्रकल्पाचा डीपीआर तयार.',
          content: `छत्रपती संभाजीनगर / जालना :\nमराठवाड्याला कायमस्वरूपी दुष्काळमुक्त करण्यासाठी आखण्यात आलेल्या वॉटरग्रीड प्रकल्पाचा सविस्तर प्रकल्प अहवाल (DPR) पूर्ण झाला आहे. याअंतर्गत सर्व प्रमुख धरणे पाईपलाईनद्वारे एकमेकांना जोडली जाणार आहेत.`,
          rect: { x: 20, y: 140, w: 560, h: 420 },
          author: 'विभागीय ब्यूरो'
        },
        {
          id: 'p3_s2',
          headline: 'डॉ. बाबासाहेब आंबेडकर मराठवाडा विद्यापीठात कौशल्य विकास केंद्राची स्थापना',
          category: 'शिक्षण विश्व',
          summary: 'विद्यार्थ्यांना थेट रोजगाराभिमुख प्रशिक्षण; १०० हून अधिक उद्योग समूहांशी करार.',
          content: `छत्रपती संभाजीनगर :\nविद्यापीठात अत्याधुनिक रोबोटिक्स, एआय आणि डेटा सायन्स कौशल्य केंद्र सुरू झाले असून यामुळे मराठवाड्यातील विद्यार्थ्यांना जागतिक दर्जाचे प्रशिक्षण मिळेल.`,
          rect: { x: 600, y: 140, w: 280, h: 420 },
          author: 'शैक्षणिक वार्ताहर'
        },
        {
          id: 'p3_s3',
          headline: 'अजिंठा-वेरूळ व जालना पर्यटन कॉरिडॉरला आंतरराष्ट्रीय पर्यटकांची पसंती',
          category: 'पर्यटन विकास',
          summary: 'धार्मिक व ऐतिहासिक वारसा स्थळांच्या जतनासाठी विशेष निधी मंजूर.',
          content: `जालना :\nजालन्यातील ऐतिहासिक मोती तलाव, जांब समर्थ व मत्सयोदरी देवी संस्थान या धार्मिक स्थळांना जागतिक पर्यटन नकाशावर स्थान मिळवून देण्यासाठी पर्यटन कॉरिडॉर विकसित केला जात आहे.`,
          rect: { x: 20, y: 580, w: 860, h: 320 },
          author: 'पर्यटन विशेष'
        }
      ]
    },
    4: {
      title: 'व्यापार, शेती व बाजारभाव (Agriculture & Mandi Rates)',
      subtitle: 'जालना कृषी उत्पन्न बाजार समिती: सोयाबीन, कापूस, मोसंबी व डाळींचे ताजे दर',
      stories: [
        {
          id: 'p4_s1',
          headline: 'जालना कृषी उत्पन्न बाजार समिती: सोयाबीन व हरभऱ्याच्या दरात तेजी',
          category: 'बाजारभाव आढावा',
          summary: 'जालना मुख्य मार्केट यार्डात आवक वाढली; सोयाबीनला प्रतिक्विंटल ५,२०० रुपयांपर्यंत भाव.',
          content: `जालना कृषी उत्पन्न बाजार समिती बाजारभाव (प्रतिक्विंटल रु.):\n\n• सोयाबीन : रु. ४,८०० ते ५,२५०\n• कापूस (मध्यम धागा) : रु. ७,४०० ते ७,८५०\n• मोसंबी (ग्रेड १) : रु. ४०,००० ते ५५,००० (प्रति टन)\n• हरभरा : रु. ५,८०० ते ६,३००\n• तूर (पांढरी/लाल) : रु. ९,५०० ते १०,२००\n• मका : रु. २,१०० ते २,३५०\n• गहू (लोकवन) : रु. २,८०० ते ३,४००\n\nव्यापारी सूत्रांनुसार आंतरराष्ट्रीय बाजारात मागणी वाढल्याने डाळी व तेलबियांच्या भावात पुढील आठवड्यात आणखी सुधारणा अपेक्षित आहे.`,
          rect: { x: 20, y: 140, w: 560, h: 420 },
          author: 'बाजार समिती वार्ताहर'
        },
        {
          id: 'p4_s2',
          headline: 'जालना स्टील मार्केट: टीएमटी सळईचे दर स्थिर; बांधकामांना गती',
          category: 'स्टील बाजार',
          summary: 'स्थानिक रोलिंग मिल्सचे उत्पादन पूर्ण क्षमतेने सुरू; किरकोळ बाजारात मागणी वाढली.',
          content: `जालना :\nजालना स्टील बाजारात टीएमटी बार्सचे दर प्रतिटन ५१,५०० ते ५३,००० रुपयांच्या दरम्यान स्थिर राहिले आहेत. रिअल इस्टेट व पायाभूत सुविधा प्रकल्पांची कामे वेगाने सुरू असल्याने स्टील उत्पादकांना दिलासा मिळाला आहे.`,
          rect: { x: 600, y: 140, w: 280, h: 420 },
          author: 'स्टील मार्केट ब्यूरो'
        },
        {
          id: 'p4_s3',
          headline: 'ठिबक सिंचन व शेततळे अनुदानासाठी ई-पीक पाहणीची मुदत १५ सप्टेंबरपर्यंत वाढवली',
          category: 'शेतकरी विशेष योजना',
          summary: 'कृषी विभागाचे आवाहन: शेतकऱ्यांनी त्वरित ऑनलाईन नोंदणी पूर्ण करण्याचे निर्देश.',
          content: `जालना :\nजिल्ह्यातील शेतकऱ्यांना सूक्ष्म सिंचन व सौर कृषी पंप योजनेचा लाभ मिळावा यासाठी महसूल विभागाने ई-पीक पाहणी नोंदणीसाठी १५ सप्टेंबरपर्यंत मुदतवाढ दिली आहे.`,
          rect: { x: 20, y: 580, w: 860, h: 300 },
          author: 'कृषी डेस्क'
        }
      ]
    },
    5: {
      title: 'क्रीडा व देश-विदेश (Sports & World News)',
      subtitle: 'राष्ट्रीय, आंतरराष्ट्रीय घडामोडी आणि क्रीडा विश्व',
      stories: [
        {
          id: 'p5_s1',
          headline: 'जालन्याच्या क्रीडा संकुलात राज्यस्तरीय कुस्ती स्पर्धेचे भव्य आयोजन',
          category: 'क्रीडा महोत्सव',
          summary: 'महाराष्ट्रभरातून ५०० हून अधिक मल्ल सहभागी; 'महाराष्ट्र केसरी' मानांकनाची चुरस.',
          content: `जालना :\nजालना जिल्हा क्रीडा संकुलात भव्य राज्यस्तरीय कुस्ती स्पर्धेचा दिमाखदार प्रारंभ झाला. मराठवाडा, पश्चिम महाराष्ट्र आणि विदर्भातील नामांकित मल्लांनी पहिल्याच दिवशी आक्रमक डावपेच सादर करत प्रेक्षकांची मने जिंकली.`,
          rect: { x: 20, y: 140, w: 560, h: 400 },
          author: 'क्रीडा प्रतिनिधी'
        },
        {
          id: 'p5_s2',
          headline: 'भारतीय अंतराळ मोहिमेचे नवे यश; सूर्ययान व चंद्र मोहिमेचा पुढील टप्पा यशस्वी',
          category: 'विज्ञान / राष्ट्रीय',
          summary: 'इस्रोच्या वैज्ञानिकांनी रचला नवा इतिहास; जागतिक पातळीवर भारताचा गौरव.',
          content: `नवी दिल्ली :\nभारतीय अंतराळ संशोधन संस्था (ISRO) ने पुढील पिढीच्या उपग्रह प्रक्षेपण मोहिमेत संपूर्ण स्वदेशी क्रायोजेनिक इंजिनचे यशस्वी परीक्षण पूर्ण केले.`,
          rect: { x: 600, y: 140, w: 280, h: 400 },
          author: 'राष्ट्रीय वृत्तसेवा'
        },
        {
          id: 'p5_s3',
          headline: 'टी-२० विश्वचषकात भारतीय क्रिकेट संघाची विजयी घोडदौड कायम',
          category: 'क्रिकेट वृत्त',
          summary: 'उत्कृष्ट फलंदाजी व अचूक गोलंदाजीच्या जोरावर उपांत्य फेरीत दिमाखात प्रवेश.',
          content: `मेलबर्न / मुंबई :\nभारतीय क्रिकेट संघाने शानदार अष्टपैलू कामगिरीच्या जोरावर टी-२० चषक स्पर्धेत सलग चौथा विजय नोंदवत अव्वल स्थान पटकावले आहे.`,
          rect: { x: 20, y: 560, w: 860, h: 300 },
          author: 'क्रीडा डेस्क'
        }
      ]
    },
    6: {
      title: 'संपादकीय व विचार (Editorial & Perspective)',
      subtitle: 'दैनिक लोकसार्थक संपादकीय, अग्रलेख आणि विचारमंथन',
      stories: [
        {
          id: 'p6_s1',
          headline: 'अग्रलेख: मराठवाड्याच्या औद्योगिक क्रांतीची नवी पहाट',
          category: 'दैनिक लोकसार्थक संपादकीय',
          summary: 'समृद्धी महामार्ग, वॉटर ग्रीड आणि स्टील हबच्या जोरावर जालन्याने साधलेली प्रगती दिशादर्शक.',
          content: `जालना आणि मराठवाड्याच्या मातीमध्ये उद्योजकतेची प्रचंड ऊर्जा आहे. दुष्काळाशी दोन हात करत जालन्याने स्टील, बियाणे, मोसंबी आणि सिल्क उद्योगात देशात आपले वेगळे स्थान निर्माण केले आहे.\n\nआता जेव्हा दळणवळणाची नवी महाजाळी उभारली जात आहे, तेव्हा स्थानिक मनुष्यबळाचे कौशल्य संवर्धन करणे काळाची गरज आहे. केवळ पायाभूत सुविधा पुरेशा नसून कृषी-प्रक्रिया उद्योगांना पतपुरवठा, अखंड वीज व पाणी नियोजन अत्यंत आवश्यक आहे.\n\nलोकसार्थकच्या माध्यमातून आम्ही सातत्याने जनतेचे प्रश्न व विकासाची मांडणी निःपक्षपातीपणे करत आलो आहोत. मराठवाड्याची ही घोडदौड अशीच अविरत राहो हीच सदिच्छा.`,
          rect: { x: 20, y: 140, w: 560, h: 450 },
          author: 'संपादक: प्रशांत गायकवाड'
        },
        {
          id: 'p6_s2',
          headline: 'विचारमंथन: सेंद्रिय शेती - भविष्यातील शाश्वत पर्याय',
          category: 'लेख / कृषी विचार',
          summary: 'विषमुक्त अन्नासाठी व जमिनीची सुपिकता टिकवण्यासाठी नैसर्गिक शेती पद्धतीचा अवलंब आवश्यक.',
          content: `रासायनिक खतांच्या अतिवापराने जमिनीची घटलेली सेंद्रिय कर्ब पातळी धोक्याची घंटा वाजवत आहे. जालन्यातील अनेक प्रगतिशील शेतकरी आता देशी गाईंवर आधारित शेतीकडे वळत असून त्यांना चांगले आर्थिक यश मिळत आहे.`,
          rect: { x: 600, y: 140, w: 280, h: 450 },
          author: 'डॉ. आनंद पाटील (कृषी तज्ज्ञ)'
        },
        {
          id: 'p6_s3',
          headline: 'वाचकांचे पत्र: जालन्यातील कचरा संकलन व आरोग्य व्यवस्थेवर लक्ष द्या',
          category: 'वाचक मंच',
          summary: 'नागरिकांनी मांडल्या विविध समस्या; प्रशासनाने तातडीने दखल घेण्याची मागणी.',
          content: `शहरातील अंतर्गत रस्त्यांची स्वच्छता नियमित व्हावी व डासांचा प्रादुर्भाव रोखण्यासाठी धूर फवारणी करावी अशी मागणी सजग नागरिकांनी पत्राद्वारे केली आहे.`,
          rect: { x: 20, y: 610, w: 860, h: 260 },
          author: 'सजग नागरिक, जालना'
        }
      ]
    }
  }
};

// Breaking News Items for Ticker
const BREAKING_NEWS = [
  { tag: 'जालना', text: 'जालना-नांदेड समृद्धी महामार्गाच्या कामाला वेग; मराठवाड्याच्या विकासाला नवी दिशा' },
  { tag: 'बाजारभाव', text: 'जालना कृषी उत्पन्न बाजार समितीत सोयाबीनचे भाव ५,२०० रुपयांवर, आवक वाढली' },
  { tag: 'उद्योग', text: 'जालना स्टील व सिडको औद्योगिक वसाहतीत ५०० कोटींची नवी गुंतवणूक मंजूर' },
  { tag: 'जलसंपदा', text: 'जायकवाडी डाव्या कालव्यातून जालन्यासाठी अतिरिक्त आवर्तन सोडण्याचे आदेश' },
  { tag: 'शिक्षण', text: 'जालना जिल्ह्यातील गुणवंत विद्यार्थ्यांसाठी लोकसार्थक शिष्यवृत्ती योजना जाहीर' },
  { tag: 'क्रीडा', text: 'जालना जिल्हा क्रीडा संकुलात भव्य राज्यस्तरीय कुस्ती स्पर्धेचा दिमाखदार प्रारंभ' }
];

// Video News Playlist
const VIDEO_NEWS = [
  {
    id: 'vid1',
    title: 'जालना शहर विकास विशेष: समृद्धी द्रुतगती जोड प्रकल्पामुळे काय बदलणार?',
    duration: '०५:३०',
    views: '१२.५ हजार',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'vid2',
    title: 'जालना मार्केट यार्डात मोसंबी व कापसाचे आजचे ताजे बाजारभाव थेट पहा',
    duration: '०३:४५',
    views: '८.२ हजार',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'vid3',
    title: 'जालना स्टील इंडस्ट्री विशेष मुलाखत: नव्या तंत्रज्ञानाने उत्पादन वाढले',
    duration: '०८:१५',
    views: '१५.४ हजार',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&auto=format&fit=crop&q=60'
  }
];

function renderEditionCardThumbs() {
  for (let i = 1; i <= 5; i++) {
    const canvas = document.getElementById(`editionThumb${i}`);
    if (!canvas) continue;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#c81e1e';
    ctx.fillRect(6, 6, w - 12, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Noto Sans Devanagari, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('दैनिक लोकसार्थक', w / 2, 19);

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(8, 30, w - 16, 40);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(12, 36, (w - 24) * 0.8, 6);
    ctx.fillRect(12, 46, (w - 24) * 0.9, 4);
    ctx.fillRect(12, 54, (w - 24) * 0.7, 4);

    const halfW = (w - 22) / 2;
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(8, 76, halfW, 90);
    ctx.fillRect(8 + halfW + 6, 76, halfW, 90);

    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(12, 82, halfW - 8, 4);
    ctx.fillRect(12, 90, halfW - 8, 3);
    ctx.fillRect(12, 96, halfW - 8, 3);

    ctx.fillRect(8 + halfW + 10, 82, halfW - 8, 4);
    ctx.fillRect(8 + halfW + 10, 90, halfW - 8, 3);
    ctx.fillRect(8 + halfW + 10, 96, halfW - 8, 3);
  }
}

// Theme Management
function initTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeToggleIcon();

  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', state.theme);
      localStorage.setItem('loksarthak_theme', state.theme);
      updateThemeToggleIcon();
      showToast(`थीम बदलली: ${state.theme === 'dark' ? 'डार्क मोड' : 'लाईट मोड'}`);
    });
  }
}

function updateThemeToggleIcon() {
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    btn.innerHTML = state.theme === 'dark' 
      ? '<i class="fa-solid fa-sun" title="लाईट मोड"></i>' 
      : '<i class="fa-solid fa-moon" title="डार्क मोड"></i>';
  }
}

// Breaking News Ticker Initialization
function initTicker() {
  const tickerTrack = document.getElementById('tickerTrack');
  if (!tickerTrack) return;

  const contentHtml = BREAKING_NEWS.map(item => `
    <div class="ticker-item" onclick="openLiveNewsModal('${item.tag}', '${item.text}')">
      <span class="ticker-tag">${item.tag}</span>
      <span>${item.text}</span>
    </div>
  `).join('');

  tickerTrack.innerHTML = contentHtml + contentHtml;
}

// Video Gallery Setup
function initVideoGallery() {
  const playlistContainer = document.getElementById('videoPlaylistColumn');
  if (!playlistContainer) return;

  playlistContainer.innerHTML = VIDEO_NEWS.map((vid, idx) => `
    <div class="playlist-item ${idx === 0 ? 'active' : ''}" onclick="switchMainVideo('${vid.id}')">
      <div class="playlist-item-thumb">
        <img src="${vid.thumbnail}" alt="${vid.title}" />
        <i class="fa-solid fa-play"></i>
      </div>
      <div class="playlist-item-info">
        <div class="playlist-item-title">${vid.title}</div>
        <div class="playlist-item-meta"><i class="fa-regular fa-clock"></i> ${vid.duration} • <i class="fa-regular fa-eye"></i> ${vid.views}</div>
      </div>
    </div>
  `).join('');
}

window.switchMainVideo = function(videoId) {
  const video = VIDEO_NEWS.find(v => v.id === videoId);
  if (!video) return;

  const mainIframe = document.getElementById('mainVideoIframe');
  const mainTitle = document.getElementById('mainVideoTitle');
  if (mainIframe) mainIframe.src = video.embedUrl;
  if (mainTitle) mainTitle.innerText = video.title;

  document.querySelectorAll('.playlist-item').forEach(item => item.classList.remove('active'));
  event?.currentTarget?.classList.add('active');
};

// Sidebar Page Thumbnails
function initSidebarThumbnails() {
  const sidebar = document.getElementById('thumbnailsList');
  if (!sidebar) return;

  sidebar.innerHTML = '';
  for (let p = 1; p <= state.totalPages; p++) {
    const pageData = EPAPER_DATABASE.pages[p] || { title: `पृष्ठ ${p}`, subtitle: '' };
    const thumbItem = document.createElement('div');
    thumbItem.className = `thumb-item ${p === state.currentPage ? 'active' : ''}`;
    thumbItem.setAttribute('data-page', p);
    thumbItem.onclick = () => goToPage(p);

    thumbItem.innerHTML = `
      <div class="thumb-canvas-box">
        <canvas id="thumbCanvas_${p}" width="160" height="240"></canvas>
      </div>
      <div class="thumb-label">पृष्ठ ${p}</div>
      <div class="thumb-sublabel">${pageData.title.split('(')[0]}</div>
    `;
    sidebar.appendChild(thumbItem);

    setTimeout(() => drawMiniThumbnail(p), 50);
  }
}

function drawMiniThumbnail(pageNumber) {
  const canvas = document.getElementById(`thumbCanvas_${pageNumber}`);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#c81e1e';
  ctx.fillRect(8, 8, w - 16, 16);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px Noto Sans Devanagari, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('दैनिक लोकसार्थक', w / 2, 20);

  ctx.fillStyle = '#334155';
  ctx.font = '7px sans-serif';
  ctx.fillText(`पृष्ठ ${pageNumber}`, w / 2, 32);

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(10, 40, w - 20, 45);

  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(14, 46, (w - 28) * 0.8, 6);
  ctx.fillRect(14, 56, (w - 28) * 0.95, 4);
  ctx.fillRect(14, 64, (w - 28) * 0.9, 4);

  const halfW = (w - 25) / 2;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(10, 92, halfW, 60);
  ctx.fillRect(10 + halfW + 5, 92, halfW, 60);

  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(14, 98, 50, 4);
  ctx.fillRect(14, 106, 55, 3);
  ctx.fillRect(10 + halfW + 9, 98, 50, 4);
  ctx.fillRect(10 + halfW + 9, 106, 55, 3);
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initTicker();
  initVideoGallery();
  initControls();
  initHotspots();
  initArchiveCalendar();
  initPWA();
  renderEditionCardThumbs();
  
  // Dynamic e-paper loader for current date
  loadEpaperForDate(state.currentDate, state.currentEdition);
});

// Canvas Viewer Setup & Image / Dynamic Newspaper Rendering
function initCanvasViewer() {
  const canvas = document.getElementById('epaperCanvas') || document.getElementById('newspaperCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Placeholder newspaper image loader as requested
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() {
    canvas.width = img.naturalWidth || 800;
    canvas.height = img.naturalHeight || 1200;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  img.onerror = function() {
    canvas.width = 900;
    canvas.height = 1350;
    renderPage(state.currentPage);
  };
  img.src = 'https://via.placeholder.com/800x1200?text=E-Paper+Page+1';
}

// Dynamic E-Paper Loader from Backend API
async function loadEpaperForDate(date, edition = 'jalna_main') {
  state.currentDate = date;
  state.currentEdition = edition;
  state.currentPage = 1;

  try {
    const res = await fetch(`/api/epaper?date=${date}&edition=${edition}`);
    if (res.ok) {
      const data = await res.json();
      if (data.epaper) {
        state.loadedEpaperData = data.epaper;
        state.totalPages = data.epaper.pageCount || 6;

        // If PDF format, load with pdf.js
        if (data.epaper.type === 'pdf' && window.pdfjsLib) {
          const loadingTask = pdfjsLib.getDocument(data.epaper.fileUrl);
          state.pdfDoc = await loadingTask.promise;
          state.totalPages = state.pdfDoc.numPages;
        } else {
          state.pdfDoc = null;
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch epaper from backend API, using local dataset:', err);
    state.loadedEpaperData = null;
    state.pdfDoc = null;
    state.totalPages = EDITIONS[edition]?.pages || 6;
  }

  updatePageDropdown();
  initSidebarThumbnails();
  renderPage(1);
}

function updatePageDropdown() {
  const select = document.getElementById('pageSelectDropdown');
  if (!select) return;

  select.innerHTML = '';
  for (let i = 1; i <= state.totalPages; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    const pageTitle = (state.loadedEpaperData?.pages && state.loadedEpaperData.pages[i - 1]?.title) ||
                      (EPAPER_DATABASE.pages[i]?.title) ||
                      `पृष्ठ ${i}`;
    opt.innerText = `पृष्ठ ${i} - ${pageTitle.split('(')[0]}`;
    select.appendChild(opt);
  }
}

async function renderPage(indexOrPageNum) {
  let index = 0;
  if (uploadedPages.length > 0) {
    if (typeof indexOrPageNum === 'number') {
      if (indexOrPageNum < 0) index = 0;
      else if (indexOrPageNum >= uploadedPages.length) index = uploadedPages.length - 1;
      else index = indexOrPageNum;
    }
    currentPageIndex = index;
    state.currentPage = index + 1;
    state.totalPages = uploadedPages.length;
  } else {
    // Normal page number (1-based)
    let pageNum = (typeof indexOrPageNum === 'number') ? indexOrPageNum : 1;
    if (pageNum < 1) pageNum = 1;
    if (pageNum > state.totalPages) pageNum = state.totalPages;
    state.currentPage = pageNum;
    currentPageIndex = pageNum - 1;
  }

  // Update current page display text (e.g., "पृष्ठ १ / ६")
  const pageDisplay = document.getElementById('pageNumberDisplay');
  if (pageDisplay) {
    pageDisplay.innerText = `पृष्ठ ${state.currentPage} / ${state.totalPages}`;
  }

  // Update dropdown selection
  const select = document.getElementById('pageSelectDropdown');
  if (select && select.value != state.currentPage) {
    select.value = state.currentPage;
  }
  updateSidebarActiveThumbnail(state.currentPage);

  const canvas = document.getElementById('epaperCanvas') || document.getElementById('newspaperCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // 1. Client-Side Uploaded Image Pages
  if (uploadedPages.length > 0 && uploadedPages[currentPageIndex]) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.naturalWidth || 900;
      canvas.height = img.naturalHeight || 1350;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = uploadedPages[currentPageIndex];

    const hotspotLayer = document.getElementById('hotspotLayer');
    if (hotspotLayer) hotspotLayer.innerHTML = '';
    return;
  }

  // 2. If PDF Document is loaded, render page with pdf.js
  if (state.pdfDoc) {
    try {
      const page = await state.pdfDoc.getPage(state.currentPage);
      const viewport = page.getViewport({ scale: 1.5 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const hotspotLayer = document.getElementById('hotspotLayer');
      if (hotspotLayer) hotspotLayer.innerHTML = '';

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };
      await page.render(renderContext).promise;
      return;
    } catch (pdfErr) {
      console.error('PDF page render error:', pdfErr);
    }
  }

  // 3. If uploaded image pages are loaded from server
  if (state.loadedEpaperData?.type === 'images' && state.loadedEpaperData.pages?.[state.currentPage - 1]?.imageUrl) {
    const imgUrl = state.loadedEpaperData.pages[state.currentPage - 1].imageUrl;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.naturalWidth || 900;
      canvas.height = img.naturalHeight || 1350;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = imgUrl;
    return;
  }

  // 4. Fallback: High-Res Interactive Vector Marathi Layout
  renderVectorNewspaperPage(state.currentPage);
}

function renderVectorNewspaperPage(pageNumber) {
  const pageData = EPAPER_DATABASE.pages[pageNumber] || EPAPER_DATABASE.pages[1];
  if (!pageData) return;

  const canvas = document.getElementById('epaperCanvas') || document.getElementById('newspaperCanvas');
  if (!canvas) return;
  if (canvas.width < 900) {
    canvas.width = 900;
    canvas.height = 1350;
  }
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Clear background (authentic newsprint off-white)
  ctx.fillStyle = '#fbfcfd';
  ctx.fillRect(0, 0, w, h);

  // Outer border & vintage newspaper margin
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.strokeRect(15, 15, w - 30, h - 30);
  ctx.lineWidth = 1;
  ctx.strokeRect(18, 18, w - 36, h - 36);

  // ==========================================
  // 1. PAGE TOP HEADER / MASTHEAD
  // ==========================================
  if (pageNumber === 1) {
    // Top small dateline
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 13px Noto Sans Devanagari, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('वर्ष ११ वे • अंक ३०५ • आर.एन.आय. क्र. MAHMAR/2015/64821', 25, 36);
    ctx.textAlign = 'right';
    ctx.fillText('जालना, शुक्रवार ०४ सप्टेंबर २०२६ • पाने: ६ • किंमत ₹ ५.००', w - 25, 36);

    // Decorative line
    ctx.strokeStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(25, 44);
    ctx.lineTo(w - 25, 44);
    ctx.stroke();

    // Masthead: LOKSARTHAK + Red Pill (लोकसार्थक)
    // English 'LOKSARTHAK'
    ctx.fillStyle = '#0b1325';
    ctx.font = '900 56px Inter, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    
    // Compute positions for centered combo logo
    const enText = 'LOKSARTHAK';
    const enWidth = ctx.measureText(enText).width;
    const badgeW = 125;
    const badgeH = 38;
    const totalW = enWidth + 16 + badgeW;
    const startX = (w - totalW) / 2;

    // Draw English Text
    ctx.textAlign = 'left';
    ctx.fillText(enText, startX, 102);

    // Draw Red Badge
    const badgeX = startX + enWidth + 16;
    const badgeY = 68;
    ctx.fillStyle = '#d32020';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 8);
      ctx.fill();
    } else {
      ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    }

    // Marathi Text inside badge
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 22px Noto Sans Devanagari, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('लोकसार्थक', badgeX + (badgeW / 2), badgeY + 27);

    // Masthead Tagline
    ctx.fillStyle = '#64748b';
    ctx.font = '600 15px Noto Sans Devanagari, Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('जिथे बातमी कधी जुनी होत नाही • Daily News & E-Paper', w / 2, 128);

    // Header divider line
    ctx.strokeStyle = '#0b1325';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(20, 138);
    ctx.lineTo(w - 20, 138);
    ctx.stroke();


  } else {
    // Inner pages header
    ctx.fillStyle = '#c81e1e';
    ctx.fillRect(20, 20, w - 40, 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Noto Sans Devanagari, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`दैनिक लोकसार्थक • ${pageData.title}`, 32, 44);
    ctx.textAlign = 'right';
    ctx.fillText(`जालना, ०४ सप्टेंबर २०२६ | पृष्ठ क्रमांक: ${pageNumber}`, w - 32, 44);

    ctx.fillStyle = '#475569';
    ctx.font = '500 13px Noto Sans Devanagari, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`[ ${pageData.subtitle} ]`, w / 2, 75);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 88);
    ctx.lineTo(w - 20, 88);
    ctx.stroke();
  }

  // ==========================================
  // 2. RENDER STORIES & NEWSPAPER BLOCKS
  // ==========================================
  pageData.stories.forEach(story => {
    drawStoryOnCanvas(ctx, story, pageNumber);
  });

  // ==========================================
  // 3. PAGE FOOTER
  // ==========================================
  ctx.fillStyle = '#64748b';
  ctx.font = '500 11px Noto Sans Devanagari, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('हे दैनिक लोकसार्थक जालनाचे अधिकृत ई-पेपर डिजिटल संस्करण आहे. सर्वाधिकार सुरक्षित © २०२६.', w / 2, h - 20);

  // Update Hotspots Layer
  updateHotspots(pageData.stories);

  // Update Page Selector Dropdown & Active UI State
  updatePageUI(pageNumber);
}

// Draw realistic news story box on newspaper canvas
function drawStoryOnCanvas(ctx, story, pageNumber) {
  const r = story.rect;

  // Box background & subtle border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(r.x, r.y, r.w, r.h);

  // Category Tag
  ctx.fillStyle = '#c81e1e';
  ctx.font = 'bold 11px Noto Sans Devanagari, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`▶ ${story.category.toUpperCase()}`, r.x + 8, r.y + 18);

  // Headline (Wrapped with realistic Marathi typography)
  ctx.fillStyle = '#0f172a';
  ctx.font = r.w > 500 ? 'bold 22px Yantramanav, Noto Sans Devanagari, sans-serif' : 'bold 17px Yantramanav, Noto Sans Devanagari, sans-serif';
  
  const headlineLineHeight = r.w > 500 ? 26 : 22;
  const headlineLines = wrapText(ctx, story.headline, r.w - 20);
  let currentY = r.y + 42;

  headlineLines.slice(0, 3).forEach(line => {
    ctx.fillText(line, r.x + 8, currentY);
    currentY += headlineLineHeight;
  });

  // Headline underline
  ctx.strokeStyle = '#c81e1e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(r.x + 8, currentY - 2);
  ctx.lineTo(r.x + Math.min(180, r.w - 20), currentY - 2);
  ctx.stroke();
  currentY += 12;

  // Author & Dateline
  ctx.fillStyle = '#64748b';
  ctx.font = 'italic 11px Noto Sans Devanagari, sans-serif';
  ctx.fillText(`✍ ${story.author} | जालना`, r.x + 8, currentY);
  currentY += 18;

  // Content Paragraphs
  ctx.fillStyle = '#334155';
  ctx.font = '13px Noto Sans Devanagari, sans-serif';
  const contentLineHeight = 19;
  const contentLines = wrapText(ctx, story.content.replace(/\n+/g, ' '), r.w - 20);

  const maxLines = Math.floor((r.y + r.h - currentY - 10) / contentLineHeight);
  contentLines.slice(0, maxLines).forEach(line => {
    ctx.fillText(line, r.x + 8, currentY);
    currentY += contentLineHeight;
  });

  // Story click hint badge at bottom right
  ctx.fillStyle = '#0ea5e9';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('🔎 Click to Read / Clip', r.x + r.w - 8, r.y + r.h - 8);
}

// Canvas Text Wrapping Helper
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

// Hotspots Layer & Interactive Article Clicks
function updateHotspots(stories) {
  const hotspotLayer = document.getElementById('hotspotLayer');
  if (!hotspotLayer) return;

  hotspotLayer.innerHTML = '';
  const canvas = document.getElementById('newspaperCanvas');
  const canvasW = canvas.width;
  const canvasH = canvas.height;

  stories.forEach(story => {
    const box = document.createElement('div');
    box.className = 'hotspot-box';
    box.style.left = `${(story.rect.x / canvasW) * 100}%`;
    box.style.top = `${(story.rect.y / canvasH) * 100}%`;
    box.style.width = `${(story.rect.w / canvasW) * 100}%`;
    box.style.height = `${(story.rect.h / canvasH) * 100}%`;

    box.onclick = () => openArticleModal(story);
    hotspotLayer.appendChild(box);
  });
}

// Update Active Page UI Controls
function updatePageUI(pageNumber) {
  const select = document.getElementById('pageSelectDropdown');
  if (select) select.value = pageNumber;

  const currentLabel = document.getElementById('pageNumberDisplay');
  if (currentLabel) currentLabel.innerText = `पृष्ठ ${pageNumber} / ${state.totalPages}`;

  // Update thumbnail highlights
  document.querySelectorAll('.thumb-item').forEach(item => {
    const p = parseInt(item.getAttribute('data-page'), 10);
    if (p === pageNumber) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// Client-Side File Upload Handler for #paperUpload
function initClientFileUpload() {
  const paperUpload = document.getElementById('paperUpload');
  if (!paperUpload) return;

  paperUpload.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    uploadedPages = [];
    currentPageIndex = 0;

    const readPromises = files.map((file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
    });

    try {
      showToast('इमेजेस प्रोसेस होत आहेत...');
      uploadedPages = await Promise.all(readPromises);
      state.totalPages = uploadedPages.length;

      // Update dropdown options
      const select = document.getElementById('pageSelectDropdown');
      if (select) {
        select.innerHTML = '';
        for (let i = 1; i <= uploadedPages.length; i++) {
          const opt = document.createElement('option');
          opt.value = i;
          opt.innerText = `पृष्ठ ${i}`;
          select.appendChild(opt);
        }
      }

      // Update sidebar thumbnails
      initSidebarThumbnails();

      // Automatically render the first page
      renderPage(0);
      showToast(`🎉 ${uploadedPages.length} पाने यशस्वीरित्या लोड झाली!`);
    } catch (err) {
      console.error('Error reading uploaded files:', err);
      alert('इमेजेस लोड करताना त्रुटी आली: ' + err.message);
    }
  });
}

// Controls Setup (Navigation, Zoom, Scissors Crop, Fullscreen, Upload)
function initControls() {
  // Initialize Client-Side File Upload
  initClientFileUpload();

  // Page Selector Dropdown
  const pageSelect = document.getElementById('pageSelectDropdown');
  if (pageSelect) {
    pageSelect.addEventListener('change', (e) => {
      const targetPage = parseInt(e.target.value, 10);
      if (uploadedPages.length > 0) {
        renderPage(targetPage - 1);
      } else {
        goToPage(targetPage);
      }
    });
  }

  // Next / Prev Buttons
  document.getElementById('btnPrevPage')?.addEventListener('click', prevPage);
  document.getElementById('btnNextPage')?.addEventListener('click', nextPage);

  // Zoom Controls
  document.getElementById('btnZoomIn')?.addEventListener('click', () => setZoom(state.zoomLevel + 0.2));
  document.getElementById('btnZoomOut')?.addEventListener('click', () => setZoom(state.zoomLevel - 0.2));
  document.getElementById('btnZoomReset')?.addEventListener('click', () => setZoom(1.0));
  document.getElementById('btnZoomFit')?.addEventListener('click', fitToWidth);
  document.getElementById('btnFullscreen')?.addEventListener('click', toggleFullscreen);

  // Scissors / Snip Crop Tool
  document.getElementById('btnCropTool')?.addEventListener('click', toggleCropTool);

  // Download Page Button
  document.getElementById('btnDownloadPage')?.addEventListener('click', downloadCurrentPage);

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'ArrowRight' || e.key === 'n') nextPage();
    if (e.key === 'ArrowLeft' || e.key === 'p') prevPage();
    if (e.key === '+' || e.key === '=') setZoom(state.zoomLevel + 0.2);
    if (e.key === '-' || e.key === '_') setZoom(state.zoomLevel - 0.2);
    if (e.key === '0') setZoom(1.0);
    if (e.key === 'Escape') {
      closeAllModals();
      if (state.isCropping) toggleCropTool();
    }
  });

  // Touch / Mouse Panning when zoomed
  initPanningEngine();
}

function goToPage(pageNumber) {
  if (uploadedPages.length > 0) {
    renderPage(pageNumber - 1);
  } else {
    if (pageNumber < 1 || pageNumber > state.totalPages) return;
    renderPage(pageNumber);
  }
  window.scrollTo({ top: 180, behavior: 'smooth' });
}

function prevPage() {
  if (uploadedPages.length > 0) {
    if (currentPageIndex > 0) {
      currentPageIndex--;
      renderPage(currentPageIndex);
    } else {
      showToast('हे पहिले पृष्ठ आहे!');
    }
  } else {
    if (state.currentPage > 1) {
      goToPage(state.currentPage - 1);
    } else {
      showToast('हे पहिले पृष्ठ आहे!');
    }
  }
}

function nextPage() {
  if (uploadedPages.length > 0) {
    if (currentPageIndex < uploadedPages.length - 1) {
      currentPageIndex++;
      renderPage(currentPageIndex);
    } else {
      showToast('हे शेवटचे पृष्ठ आहे!');
    }
  } else {
    if (state.currentPage < state.totalPages) {
      goToPage(state.currentPage + 1);
    } else {
      showToast('हे शेवटचे पृष्ठ आहे!');
    }
  }
}

function setZoom(level) {
  state.zoomLevel = Math.max(state.minZoom, Math.min(state.maxZoom, parseFloat(level.toFixed(2))));
  const container = document.getElementById('paperPageContainer');
  const zoomText = document.getElementById('zoomLevelText');

  if (container) {
    container.style.transform = `scale(${state.zoomLevel})`;
  }
  if (zoomText) {
    zoomText.innerText = `${Math.round(state.zoomLevel * 100)}%`;
  }
}

function fitToWidth() {
  const viewport = document.getElementById('paperCanvasViewport');
  if (!viewport) return;
  const availableWidth = viewport.clientWidth - 40;
  const zoom = availableWidth / 900;
  setZoom(zoom);
  showToast('पृष्ठ स्क्रीननुसार ॲडजस्ट केले!');
}

function toggleFullscreen() {
  const elem = document.getElementById('paperViewerOuter');
  if (!document.fullscreenElement) {
    elem?.requestFullscreen().catch(err => console.log(err));
  } else {
    document.exitFullscreen();
  }
}

// Panning Engine for smooth dragging when zoomed
function initPanningEngine() {
  const viewport = document.getElementById('paperCanvasViewport');
  if (!viewport) return;

  viewport.addEventListener('mousedown', (e) => {
    if (state.isCropping || state.zoomLevel <= 1.0) return;
    state.isPanning = true;
    state.panStart = { x: e.clientX, y: e.clientY };
    viewport.classList.add('panning');
  });

  window.addEventListener('mousemove', (e) => {
    if (!state.isPanning) return;
    const dx = e.clientX - state.panStart.x;
    const dy = e.clientY - state.panStart.y;
    viewport.scrollLeft -= dx;
    viewport.scrollTop -= dy;
    state.panStart = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mouseup', () => {
    state.isPanning = false;
    viewport.classList.remove('panning');
  });
}

// Interactive Scissors / Crop Snip Tool
function toggleCropTool() {
  state.isCropping = !state.isCropping;
  const btn = document.getElementById('btnCropTool');
  const cropLayer = document.getElementById('cropOverlayLayer');
  const viewport = document.getElementById('paperCanvasViewport');

  if (state.isCropping) {
    btn?.classList.add('active');
    cropLayer?.classList.add('active');
    viewport?.classList.add('cropping');
    showToast('कात्रण काढण्यासाठी पेपरवर चौकोन ड्रॅग करा ✂️');
    initCropDrawing();
  } else {
    btn?.classList.remove('active');
    cropLayer?.classList.remove('active');
    viewport?.classList.remove('cropping');
    clearCropSelection();
  }
}

function initCropDrawing() {
  const cropLayer = document.getElementById('cropOverlayLayer');
  if (!cropLayer) return;

  let isDrawing = false;
  let startX = 0;
  let startY = 0;

  cropLayer.onmousedown = (e) => {
    if (!state.isCropping) return;
    isDrawing = true;
    const rect = cropLayer.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;

    clearCropSelection();
    createCropSelectionBox(startX, startY);
  };

  cropLayer.onmousemove = (e) => {
    if (!isDrawing) return;
    const rect = cropLayer.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    const box = document.getElementById('activeCropSelectionBox');
    if (box) {
      box.style.left = `${left}px`;
      box.style.top = `${top}px`;
      box.style.width = `${width}px`;
      box.style.height = `${height}px`;

      state.cropSelection = { left, top, width, height };
    }
  };

  cropLayer.onmouseup = () => {
    if (!isDrawing) return;
    isDrawing = false;
    if (state.cropSelection && state.cropSelection.width > 30 && state.cropSelection.height > 30) {
      showCropActionButtons();
    }
  };
}

function createCropSelectionBox(x, y) {
  const cropLayer = document.getElementById('cropOverlayLayer');
  const box = document.createElement('div');
  box.id = 'activeCropSelectionBox';
  box.className = 'crop-selection-box';
  box.style.left = `${x}px`;
  box.style.top = `${y}px`;
  box.style.width = '0px';
  box.style.height = '0px';

  cropLayer.appendChild(box);
}

function showCropActionButtons() {
  const box = document.getElementById('activeCropSelectionBox');
  if (!box) return;

  const actions = document.createElement('div');
  actions.className = 'crop-actions-floating';
  actions.innerHTML = `
    <button class="crop-btn save" onclick="captureAndShareCrop()"><i class="fa-solid fa-scissors"></i> क्लिप करा व शेअर</button>
    <button class="crop-btn cancel" onclick="toggleCropTool()"><i class="fa-solid fa-times"></i> रद्द</button>
  `;
  box.appendChild(actions);
}

function clearCropSelection() {
  const box = document.getElementById('activeCropSelectionBox');
  if (box) box.remove();
  state.cropSelection = null;
}

// Generate Watermarked High-Res Clipping for Sharing / Download
window.captureAndShareCrop = function() {
  if (!state.cropSelection) return;

  const originalCanvas = document.getElementById('epaperCanvas') || document.getElementById('newspaperCanvas');
  const cropLayer = document.getElementById('cropOverlayLayer');
  const scaleX = originalCanvas.width / cropLayer.clientWidth;
  const scaleY = originalCanvas.height / cropLayer.clientHeight;

  const sx = state.cropSelection.left * scaleX;
  const sy = state.cropSelection.top * scaleY;
  const sw = state.cropSelection.width * scaleX;
  const sh = state.cropSelection.height * scaleY;

  // Create Watermarked Export Canvas
  const outCanvas = document.createElement('canvas');
  const headerHeight = 60;
  outCanvas.width = sw;
  outCanvas.height = sh + headerHeight;

  const ctx = outCanvas.getContext('2d');

  // Fill White Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);

  // Draw Masthead Header on Clip
  ctx.fillStyle = '#0b1325';
  ctx.fillRect(0, 0, outCanvas.width, headerHeight);

  // English Text
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 20px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('LOKSARTHAK', 14, 34);

  // Red Badge
  ctx.fillStyle = '#d32020';
  const clipBadgeX = 14 + ctx.measureText('LOKSARTHAK').width + 8;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(clipBadgeX, 15, 75, 26, 6);
    ctx.fill();
  } else {
    ctx.fillRect(clipBadgeX, 15, 75, 26);
  }

  // Marathi Badge Text
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 14px Noto Sans Devanagari, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('लोकसार्थक', clipBadgeX + 37.5, 33);

  // Date & Link on Right
  ctx.font = '600 11px Noto Sans Devanagari, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'right';
  ctx.fillText('जालना • ०४ सप्टें २०२६ | loksarthak.in', outCanvas.width - 14, 34);

  // Tagline below header
  ctx.font = '500 9px Noto Sans Devanagari, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.textAlign = 'left';
  ctx.fillText('जिथे बातमी कधी जुनी होत नाही • Daily News & E-Paper', 14, 52);

  // Draw Cropped Image Content
  ctx.drawImage(originalCanvas, sx, sy, sw, sh, 0, headerHeight, sw, sh);

  // Border around clip
  ctx.strokeStyle = '#d32020';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, outCanvas.width, outCanvas.height);

  const clipDataUrl = outCanvas.toDataURL('image/jpeg', 0.95);

  // Open Clip Share Modal
  openClipModal(clipDataUrl);
  toggleCropTool();
};

// Article Detail Modal & Text-to-Speech
function openArticleModal(story) {
  const modal = document.getElementById('articleModal');
  if (!modal) return;

  document.getElementById('modalArticleHeadline').innerText = story.headline;
  document.getElementById('modalArticleCategory').innerText = `▶ ${story.category}`;
  document.getElementById('modalArticleAuthor').innerText = `✍ ${story.author} • जालना`;
  document.getElementById('modalArticleDate').innerText = `📅 ०४ सप्टेंबर २०२६ • पृष्ठ ${state.currentPage}`;
  document.getElementById('modalArticleContent').innerText = story.content;

  // Generate Article Clip Snapshot
  generateStoryClipImage(story);

  // Setup Social Sharing URLs
  const shareText = `*${story.headline}*\n\nवाचा दैनिक लोकसार्थक जालना ई-पेपरवर:\n`;
  const shareUrl = window.location.href;

  document.getElementById('btnArticleShareWa').onclick = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + shareUrl)}`, '_blank');
  };
  document.getElementById('btnArticleShareFb').onclick = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  };
  document.getElementById('btnArticleShareTw').onclick = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(story.headline)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  // Text to Speech
  const ttsBtn = document.getElementById('btnSpeechPlay');
  if (ttsBtn) {
    ttsBtn.onclick = () => toggleSpeechSynthesis(story.headline + '. ' + story.content);
  }

  modal.classList.add('active');
}

function generateStoryClipImage(story) {
  const originalCanvas = document.getElementById('epaperCanvas') || document.getElementById('newspaperCanvas');
  const imgElem = document.getElementById('modalArticleClipImg');

  const sx = story.rect.x;
  const sy = story.rect.y;
  const sw = story.rect.w;
  const sh = story.rect.h;

  const clipCanvas = document.createElement('canvas');
  const headerHeight = 50;
  clipCanvas.width = sw;
  clipCanvas.height = sh + headerHeight;

  const ctx = clipCanvas.getContext('2d');
  ctx.fillStyle = '#0b1325';
  ctx.fillRect(0, 0, clipCanvas.width, headerHeight);

  // Draw combo logo
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 18px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('LOKSARTHAK', 12, 32);

  ctx.fillStyle = '#d32020';
  const badgeX = 12 + ctx.measureText('LOKSARTHAK').width + 8;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(badgeX, 14, 68, 24, 6);
    ctx.fill();
  } else {
    ctx.fillRect(badgeX, 14, 68, 24);
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 13px Noto Sans Devanagari, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('लोकसार्थक', badgeX + 34, 31);

  ctx.drawImage(originalCanvas, sx, sy, sw, sh, 0, headerHeight, sw, sh);

  const clipUrl = clipCanvas.toDataURL('image/jpeg', 0.95);
  if (imgElem) imgElem.src = clipUrl;

  document.getElementById('btnArticleDownloadClip').onclick = () => {
    downloadImage(clipUrl, `Loksarthak_Jalna_Clip_${Date.now()}.jpg`);
  };
}


// Speech Synthesis for Marathi Audio Read-out
function toggleSpeechSynthesis(text) {
  if (!('speechSynthesis' in window)) {
    showToast('तुमच्या ब्राउझरमध्ये ऑडिओ सुविधा उपलब्ध नाही');
    return;
  }

  const ttsBtn = document.getElementById('btnSpeechPlay');

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    if (ttsBtn) ttsBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> बातमी ऐका';
    showToast('ऑडिओ थांबवला');
  } else {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'mr-IN'; // Marathi / Indian voice
    utterance.rate = 0.95;

    utterance.onend = () => {
      if (ttsBtn) ttsBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> बातमी ऐका';
    };

    window.speechSynthesis.speak(utterance);
    if (ttsBtn) ttsBtn.innerHTML = '<i class="fa-solid fa-pause"></i> थांबवा';
    showToast('मराठीत बातमी वाचन सुरू आहे... 🔊');
  }
}

// Crop Clip Share Modal
function openClipModal(clipDataUrl) {
  const modal = document.getElementById('cropShareModal');
  const imgElem = document.getElementById('modalCropResultImg');
  if (!modal || !imgElem) return;

  imgElem.src = clipDataUrl;

  const shareText = `*दैनिक लोकसार्थक जालना - बातमी कात्रण*\n\nअधिक बातम्यांसाठी वाचा ई-पेपर:\n`;
  const shareUrl = window.location.href;

  document.getElementById('btnCropShareWa').onclick = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + shareUrl)}`, '_blank');
  };

  document.getElementById('btnCropDownload').onclick = () => {
    downloadImage(clipDataUrl, `Loksarthak_Jalna_Snippet_${Date.now()}.jpg`);
  };

  modal.classList.add('active');
}

// Download Full Page as High-Res Image
function downloadCurrentPage() {
  const canvas = document.getElementById('epaperCanvas') || document.getElementById('newspaperCanvas');
  if (!canvas) return;

  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  downloadImage(dataUrl, `Dainik_Loksarthak_Jalna_Page_${state.currentPage}_${state.currentDate}.jpg`);
  showToast(`पृष्ठ ${state.currentPage} डाउनलोड झाले!`);
}

function downloadImage(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Archive Calendar Management
async function initArchiveCalendar() {
  const calendarModal = document.getElementById('archiveModal');
  const openBtn = document.getElementById('btnOpenArchiveModal');
  const grid = document.getElementById('archiveCalendarGrid');

  if (openBtn && calendarModal) {
    openBtn.onclick = () => {
      calendarModal.classList.add('active');
      initArchiveCalendar(); // Refresh dates on open
    };
  }

  if (!grid) return;

  // Fetch available archives from backend API
  let availableDates = [];
  try {
    const res = await fetch('/api/archives');
    if (res.ok) {
      const data = await res.json();
      if (data.archives) {
        availableDates = data.archives.map(a => a.date);
      }
    }
  } catch (e) {
    console.warn('Could not fetch archives list:', e);
  }

  // Days header
  const daysHeader = ['रवि', 'सोम', 'मंगळ', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
  grid.innerHTML = daysHeader.map(d => `<div class="cal-day-header">${d}</div>`).join('');

  // Render past 30 days
  for (let i = 1; i <= 30; i++) {
    const day = i;
    const dateStr = `2026-09-${day < 10 ? '0' + day : day}`;
    const hasPaper = availableDates.includes(dateStr) || (day <= 4);
    const isSelected = (dateStr === state.currentDate);

    const dateCell = document.createElement('div');
    dateCell.className = `cal-date-cell ${isSelected ? 'today active' : ''} ${hasPaper ? 'has-paper' : ''}`;
    dateCell.innerHTML = `
      <span>${day < 10 ? '०' : ''}${day} सप्टें</span>
      ${hasPaper ? '<span style="font-size:0.65rem; display:block; color:var(--primary); font-weight:700;">● अंक उपलब्ध</span>' : ''}
    `;

    dateCell.onclick = () => {
      document.querySelectorAll('.cal-date-cell').forEach(c => c.classList.remove('active'));
      dateCell.classList.add('active');
      loadEpaperForDate(dateStr, state.currentEdition);
      closeAllModals();
    };

    grid.appendChild(dateCell);
  }
}

// Regional Edition Switcher
window.switchEdition = function(editionKey) {
  if (!EDITIONS[editionKey]) return;
  state.currentEdition = editionKey;
  state.totalPages = EDITIONS[editionKey].pages;
  
  const pill = document.getElementById('currentEditionPill');
  if (pill) pill.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${EDITIONS[editionKey].name}`;

  initSidebarThumbnails();
  renderPage(1);
  showToast(`आवृत्ती निवडली: ${EDITIONS[editionKey].name}`);
};

// Live News & Edition Modals
window.openLiveNewsModal = function(tag, text) {
  const story = {
    headline: text,
    category: `ताजी बातमी • ${tag}`,
    author: 'लोकसार्थक न्यूज नेटवर्क',
    content: `जालना / महाराष्ट्र :\n${text}\n\nसविस्तर माहितीनुसार, या घडामोडीवर संबंधित प्रशासनाने तातडीने कार्यवाही सुरू केली असून स्थानिक नागरिकांकडून याचे स्वागत होत आहे. अधिक ताज्या व विश्वसनीय बातम्यांसाठी वाचत रहा 'दैनिक लोकसार्थक'.`,
    rect: { x: 20, y: 140, w: 560, h: 360 }
  };
  openArticleModal(story);
};

window.openEditionModal = function() {
  const archiveModal = document.getElementById('archiveModal');
  if (archiveModal) archiveModal.classList.add('active');
};


// Modal Close Helpers
window.closeAllModals = function() {
  document.querySelectorAll('.modal-overlay').forEach(modal => modal.classList.remove('active'));
  if (window.speechSynthesis) window.speechSynthesis.cancel();
};

// Toast Notifications Helper
function showToast(message) {
  let toast = document.getElementById('liveToastNotice');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'liveToastNotice';
    toast.className = 'toast-notice';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#22c55e;"></i> ${message}`;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

// PWA Install Prompts
function initPWA() {
  let deferredPrompt;
  const installBanner = document.getElementById('topInstallBanner');
  const installBtn = document.getElementById('btnInstallApp');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBanner) installBanner.style.display = 'flex';
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('लोकसार्थक ई-पेपर ॲप इन्स्टॉल केले!');
        }
        deferredPrompt = null;
        if (installBanner) installBanner.style.display = 'none';
      }
    });
  }

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW registration:', err));
  }
}

// =========================================================================
// AI AGENT INTEGRATION (Vercel AI SDK & Claude)
// System Prompt: "You are a helpful assistant for Dainik Loksarthak readers. Answer questions based on the Marathi news content provided."
// =========================================================================
window.openAiChatModal = function() {
  const modal = document.getElementById('aiChatModal');
  if (modal) modal.classList.add('active');
  const input = document.getElementById('aiUserInput');
  if (input) input.focus();
};

window.sendQuickAiQuery = function(query) {
  const input = document.getElementById('aiUserInput');
  if (input) {
    input.value = query;
    sendAiMessage();
  }
};

let aiChatHistory = [];

window.sendAiMessage = async function() {
  const input = document.getElementById('aiUserInput');
  const messagesContainer = document.getElementById('aiChatMessages');
  const sendBtn = document.getElementById('btnAiSend');
  if (!input || !messagesContainer) return;

  const userQuery = input.value.trim();
  if (!userQuery) return;

  // Clear input
  input.value = '';

  // Append user message to UI
  const userMsgDiv = document.createElement('div');
  userMsgDiv.className = 'ai-msg user';
  userMsgDiv.innerHTML = `
    <div class="ai-msg-avatar"><i class="fa-solid fa-user"></i></div>
    <div class="ai-msg-bubble">${escapeHtml(userQuery)}</div>
  `;
  messagesContainer.appendChild(userMsgDiv);

  // Append bot placeholder
  const botMsgDiv = document.createElement('div');
  botMsgDiv.className = 'ai-msg bot';
  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'ai-msg-bubble';
  bubbleDiv.innerHTML = '<span class="ai-typing-indicator"><i class="fa-solid fa-spinner fa-spin"></i> लोकसार्थक AI विचार करत आहे...</span>';
  botMsgDiv.innerHTML = '<div class="ai-msg-avatar"><i class="fa-solid fa-robot"></i></div>';
  botMsgDiv.appendChild(bubbleDiv);
  messagesContainer.appendChild(botMsgDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // Prepare context from today's newspaper
  const newsContext = Object.values(EPAPER_DATABASE.pages).map(p => {
    return `[${p.title}]\n` + p.stories.map(s => `• ${s.headline} (${s.category}): ${s.summary || s.content.substring(0, 150)}`).join('\n');
  }).join('\n\n');

  aiChatHistory.push({ role: 'user', content: userQuery });

  try {
    if (sendBtn) sendBtn.disabled = true;
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: aiChatHistory,
        newsContext: newsContext
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    // Read streaming text from Vercel AI SDK route
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      accumulatedText += decoder.decode(value, { stream: true });
      bubbleDiv.innerHTML = formatMarkdown(accumulatedText);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    aiChatHistory.push({ role: 'assistant', content: accumulatedText });
  } catch (err) {
    console.warn('AI Chat streaming fallback:', err);
    // Intelligent client-side fallback if server offline or API key missing
    const fallbackAnswer = generateClientAiResponse(userQuery);
    bubbleDiv.innerHTML = formatMarkdown(fallbackAnswer);
    aiChatHistory.push({ role: 'assistant', content: fallbackAnswer });
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
};

function generateClientAiResponse(query) {
  const q = query.toLowerCase();
  if (q.includes('समृद्धी') || q.includes('महामार्ग') || q.includes('रस्ता') || q.includes('विकास')) {
    return "🛣️ **जालना-नांदेड समृद्धी महामार्ग अपडेट:**\n\nजालना ते नांदेड समृद्धी महामार्गाच्या पहिल्या टप्प्यातील भूसंपादन पूर्ण झाले असून कंत्राटदारांना कार्यारंभ आदेश देण्यात आले आहेत. या महामार्गामुळे जालना-नांदेड अंतर अवघ्या २ तासांवर येणार असून स्थानिक स्टील आणि शेती उद्योगांना मोठा फायदा होईल.";
  } else if (q.includes('बाजारभाव') || q.includes('सोयाबीन') || q.includes('कापूस') || q.includes('भाव') || q.includes('दर') || q.includes('मोसंबी')) {
    return "🌾 **आजचे जालना कृषी उत्पन्न बाजार समिती दर (प्रतिक्विंटल):**\n\n• **सोयाबीन**: रु. ४,८०० ते ५,२५०\n• **कापूस**: रु. ७,४०० ते ७,८५०\n• **मोसंबी (ग्रेड १)**: रु. ४०,००० ते ५५,००० प्रति टन\n• **हरभरा**: रु. ५,८०० ते ६,३००\n• **तूर**: रु. ९,५०० ते १०,२००\n• **स्टील टीएमटी**: रु. ५१,५००/टन";
  } else if (q.includes('बातम्या') || q.includes('ठळक') || q.includes('मुख्य')) {
    return "📰 **दैनिक लोकसार्थक - आजच्या ठळक घडामोडी:**\n\n1. जालना-नांदेड समृद्धी महामार्गाच्या कामाला वेग.\n2. जालना औद्योगिक वसाहतीत ५०० कोटींची नवी गुंतवणूक.\n3. जायकवाडी धरणातून जालन्यासाठी अतिरिक्त आवर्तन.\n4. मोसंबी संशोधन केंद्रात आधुनिक 'क्लायमेट-स्मार्ट' तंत्रज्ञान प्रारंभ.\n5. जालना जिल्हा क्रीडा संकुलात राज्यस्तरीय कुस्ती स्पर्धा सुरू.";
  }
  return `🙏 धन्यवाद! 'दैनिक लोकसार्थक'च्या वाचकांसाठी मी नेहमी तत्पर आहे. आपल्या प्रश्नानुसार ("${query}"), आजच्या अंकात जालना शहर, शेती बाजारभाव व समृद्धी महामार्गाबाबत सविस्तर वृत्त प्रसिद्ध झाले आहे. अधिक माहितीसाठी ई-पेपरचे विविध विभाग पहावे.`;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br />');
}

function formatMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '<br /><br />')
    .replace(/\n/g, '<br />');
}

