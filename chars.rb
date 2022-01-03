$idb = {
	/snicker'?s mum/i => {
		name: 'Snickers’ Mum',
		gender: :female,
		age: :adult,
		negative: []
	},
	/mackenzie/i => {
		name: 'Mackenzie',
		gender: :male,
		age: :kid,
		negative: []
	},
	/mackenzies mum/i => {
		name: 'Mackenzie’s Mum',
		gender: :female,
		age: :adult,
		negative: []
	},
	/honey'?s mum/i => {
		name: 'Honey’s Mum',
		gender: :female,
		age: :adult,
		negative: [:honey_parents]
	},
	/juniper'?s mum/i => {
		name: 'Juniper’s Mum',
		gender: :female,
		age: :adult,
		negative: []
	},
	/coco'?s mum/i => {
		name: 'Coco’s Mum',
		gender: :female,
		age: :adult,
		negative: [:coco_parents]
	},
	/indy'?s mum/i => {
		name: 'Indy’s Mum',
		gender: :female,
		age: :adult,
		negative: []
	},
	/chloe'?s mum/i => {
		name: 'Chloe’s Mum',
		gender: :female,
		age: :adult,
		negative: []
	},
	/jean-?luc'?s mum/i => {
		name: 'Jean-Luc’s Mum',
		gender: :female,
		age: :adult,
		negative: []
	},
	/(lucky'?s dad|pat)/i => {
		name: 'Pat',
		gender: :male,
		age: :adult,
		negative: []
	},
	/winton'?s dad/i => {
		name: 'Winton’s Dad',
		gender: :male,
		age: :adult,
		negative: []
	},
	/chloe'?s dad/i => {
		name: 'Chloe’s Dad',
		gender: :male,
		age: :adult,
		negative: []
	},
	/honey'?s dad/i => {
		name: 'Honey’s Dad',
		gender: :male,
		age: :adult,
		negative: [:honey_parents]
	},
	/Gruber'?s dad/i => {
		name: 'Gruber’s Dad',
		gender: :male,
		age: :adult,
		negative: []
	},
	/mackenzie'?s dad/i => {
		name: 'Mackenzie’s Dad',
		gender: :male,
		age: :adult,
		negative: []
	},
	/jean(-?luc)?'?s dad/i => {
		name: 'Jean-Luc’s Dad',
		gender: :male,
		age: :adult,
		negative: []
	},
	/bluey/i => {
		name: 'Bluey',
		gender: :female,
		age: :kid,
		negative: [:family_bluey]
	},
	/jean(-?luc)?/i => {
		name: 'Jean-Luc',
		gender: :male,
		age: :kid,
		negative: []
	},
	/bingo/i => {
		name: 'Bingo',
		gender: :male,
		age: :kid,
		negative: [:family_bluey]
	},
	/bandit/i => {
		name: 'Bandit',
		gender: :male,
		age: :adult,
		negative: [:family_bluey, :bluey_parents]
	},
	/chil?li/i => {
		name: 'Mrs Chilli',
		gender: :female,
		age: :adult,
		negative: [:family_bluey, :bluey_parents]
	},
	/lucky/i => {
		name: 'Lucky',
		gender: :male,
		age: :kid,
		negative: []
	},
	/indy/i => {
		name: 'Indy',
		gender: :female,
		age: :kid,
		negative: []
	},
	/coco/i => {
		name: 'CoCo',
		gender: :female,
		age: :kid,
		negative: []
	},
	/snickers/i => {
		name: 'Snickers',
		gender: :male,
		age: :kid,
		negative: []
	},
	/honey/i => {
		name: 'Honey',
		gender: :female,
		age: :kid,
		negative: []
	},
	/mac(kenzie)?$/i => {
		name: 'Mackenzie',
		gender: :female,
		age: :kid,
		negative: []
	},
	/chloe/i => {
		name: 'Chloe',
		gender: :female,
		age: :kid,
		negative: []
	},
	/judo/i => {
		name: 'Judo',
		gender: :female,
		age: :kid,
		negative: []
	},
	/rusty/i => {
		name: 'Rusty',
		gender: :male,
		age: :kid,
		negative: []
	},
	/rusty'?s dad/i => {
		name: 'Rusty\'s dad',
		gender: :male,
		age: :adult,
		negative: []
	},
	/muffin/i => {
		name: 'Muffin',
		gender: :female,
		age: :kid,
		negative: [:family_bluey]
	},
	/socks/i => {
		name: 'Socks',
		gender: :female,
		age: :kid,
		negative: [:family_bluey]
	},
	/pretzel/i => {
		name: 'Pretzel',
		gender: :male,
		age: :kid,
		negative: []
	},
	/bentley/i => {
		name: 'Bentley',
		gender: :female,
		age: :kid,
		negative: []
	},
	/missy/i => {
		name: 'Missy',
		gender: :female,
		age: :kid,
		negative: []
	},
	/gruber/i => {
		name: 'Gruber',
		gender: :male,
		age: :kid,
		negative: []
	},
	/juniper/i => {
		name: 'Juniper',
		gender: :female,
		age: :kid,
		negative: []
	},
	/buddy/i => {
		name: 'Buddy',
		gender: :male,
		age: :kid,
		negative: []
	},
	/(uncle )?stripe/i => {
		name: 'Uncle Stripe',
		gender: :male,
		age: :adult,
		negative: [:family_bluey, :cousin_parents]
	},
	/(aunt )?trix(ie)?/i => {
		name: 'Aunt Trixie',
		gender: :female,
		age: :adult,
		negative: [:family_bluey, :cousin_parents]
	},
	/(judo's mum|wendy)/i => {
		name: 'Wendy',
		gender: :female,
		age: :adult,
		negative: []
	},
	/bob/i => {
		name: 'Bob',
		gender: :male,
		age: :adult,
		negative: [:family_bluey]
	},
	/nana/i => {
		name: 'Nana',
		gender: :female,
		age: :adult,
		negative: [:family_bluey]
	},
	/calypso/i => {
		name: 'Calypso',
		gender: :female,
		age: :adult,
		negative: []
	},
	/busker/i => {
		name: 'Busker',
		gender: :male,
		age: :adult,
		negative: []
	},
	/winton/i => {
		name: 'Winton',
		gender: :male,
		age: :kid,
		negative: []
	},
	/poffertje/i => {
		name: 'Poffertje Dog',
		gender: :male,
		age: :adult,
		negative: []
	},
	/docket/i => {
		name: 'Docket Boy',
		gender: :male,
		age: :adult,
		negative: []
	},
	/doctor/i => {
		name: 'Doctor',
		gender: :female,
		age: :adult,
		negative: []
	},
	/nurse/i => {
		name: 'Nurse',
		gender: :female,
		age: :adult,
		negative: []
	},
	/surfer/i => {
		name: 'Surfer',
		gender: :female,
		age: :adult,
		negative: []
	},
	/checkout/i => {
		name: 'Checkout Lady',
		gender: :female,
		age: :adult,
		negative: []
	},
	/vet/i => {
		name: 'Vet Corgi',
		gender: :female,
		age: :adult,
		negative: []
	},
	/customer/i => {
		name: 'Customer',
		gender: :male,
		age: :adult,
		negative: []
	},
	/mrs retriever/i => {
		name: 'Mrs. Retriever',
		gender: :female,
		age: :adult,
		negative: []
	},
	/rocko/i => {
		name: 'Rocko',
		gender: :male,
		age: :adult,
		negative: []
	},
  #####
	/jack/i => {
		name: 'Jack',
		gender: :male,
		age: :kid,
		negative: []
	},
	/jack'?s dad/i => {
		name: 'Jack\'s Dad',
		gender: :male,
		age: :adult,
		negative: []
	},
	/jack'?s mum/i => {
		name: 'Jack\'s Mum',
		gender: :female,
		age: :adult,
		negative: []
	},
	/jack'?s sister/i => {
		name: 'Jack\'s sister',
		gender: :female,
		age: :kid,
		negative: []
	},
	/Lila/i => {
		name: 'Lila',
		gender: :female,
		age: :kid,
		negative: []
	},
	/rad/i => {
		name: 'Rad',
		gender: :male,
		age: :adult,
		negative: [:family_bluey]
	},
	/alfie/i => {
		name: 'Alfie',
		gender: :male,
		age: :adult,
		negative: []
	},
	/bella|coco'?s mum/i => {
		name: 'Bella',
		gender: :female,
		age: :adult,
		negative: []
	},
	/captain/i => {
		name: 'Captain',
		gender: :male,
		age: :adult,
		negative: []
	},
	/checkout( dog)?/i => {
		name: 'Checkout Dog',
		gender: :female,
		age: :adult,
		negative: []
	},
	/checkout( lady)?/i => {
		name: 'Checkout Lady',
		gender: :female,
		age: :adult,
		negative: []
	},
	/chris/i => {
		name: 'Chris',
		gender: :male,
		age: :adult,
		negative: [:family_bluey]
	},
	/daisy/i => {
		name: 'Daisy',
		gender: :female,
		age: :kid,
		negative: []
	},
	/docket boy/i => {
		name: 'Docket Boy',
		gender: :male,
		age: :adult,
		negative: []
	},
	/winnie'?s dad|fido/i => {
		name: 'Fido',
		gender: :male,
		age: :adult,
		negative: []
	},
	/winnie'?s dad|fido/i => {
		name: 'Fido',
		gender: :male,
		age: :adult,
		negative: []
	},
	/harley/i => {
		name: 'Harley',
		gender: :female,
		age: :kid,
		negative: []
	},
	/hercules/i => {
		name: 'Hercules',
		gender: :male,
		age: :kid,
		negative: []
	},
	/hercules/i => {
		name: 'Hercules',
		gender: :male,
		age: :kid,
		negative: []
	},
	/jasper( w)?/i => {
		name: 'Jasper W',
		gender: :male,
		age: :adult,
		negative: []
	},
	/marcus/i => {
		name: 'Marcus',
		gender: :male,
		age: :kid,
		negative: []
	},
	/mia/i => {
		name: 'Mia',
		gender: :female,
		age: :kid,
		negative: []
	},
	/pony( lady)?/i => {
		name: 'Pony Lady',
		gender: :female,
		age: :adult,
		negative: []
	},
	/postie/i => {
		name: 'Postie',
		gender: :male,
		age: :adult,
		negative: []
	},
	/sadie/i => {
		name: 'Sadie',
		gender: :female,
		age: :girl,
		negative: []
	},
	/shanelle/i => {
		name: 'Shanelle',
		gender: :female,
		age: :adult,
		negative: []
	}
}
