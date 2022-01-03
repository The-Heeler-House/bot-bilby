require 'date'
require 'sqlite3'
require './chars.rb'
require 'chronic'

for arg in ARGV
   puts arg
end
print ARGV[0]
FORTUNE = [
'Reply hazy, try again',
'Excellent Luck',
'Good Luck',
'Average Luck',
'Bad Luck',
'Good news will come to you by mail',
'（　´_ゝ`）ﾌｰﾝ',
'ｷﾀ━━━━━━(ﾟ∀ﾟ)━━━━━━ !!!!',
'You will meet a dark handsome stranger',
'Better not tell you now',
'Outlook good',
'Very Bad Luck',
'Godly Luck']

def f(name)
	return if name.nil?
	$idb.select{|r| !(r =~ name).nil? }
end

def speculate(a, b)
	return "#{a} and #{b}?"
end

def ra(ary)
	ary[rand(ary.length)]
end

def calculate(a_h, b_h)

	a = a_h.values.first
	b = b_h.values.first

	a_name = a[:name]
	b_name = b[:name]

	ary = []

	ary << speculate(a_name, b_name)

	if (a_name == b_name)
		ary << 'What do you think?'
		return ary.join(' ')
	end

	if ((a[:negative] & b[:negative]).include?(:cousin_parents))
	    ary << ra([
	    	"They're already together!"])
	return ary.join(' ')
	end

	if ((a[:negative] & b[:negative]).include?(:bluey_parents))
	    ary << ra([
	    	"They're already together!"])
	return ary.join(' ')
	end


	if (a[:gender] == b[:gender])
	    	ary << ra([
	'Interesting ship...',
	'A taste for slash I see?',
	'Creative ship.'
		])
	end

	no = false

	if (a[:age] != b[:age])
		ary << ra([
	'Take a seat over there.',
   	'Cannot permit that!',
	'Ew, no.',
	'Bit far a part in age?'
		])
		no = true
	end

	if ((a[:negative] & b[:negative]).include?(:family_bluey))
	    ary << ra([
		    "That's certainly a unique ship.",
		    'So you think incest is wincest?',
		    "It's forbidden love."])
	end

	unless no
		ary << case ([a_name, b_name].join.length % 2)
		when 0 then ra(["What can I say, it's sheer destiny for them.",
		    "They'd be perfect together <3.",
		"I agree, that would work."])
		when 1 then ra(["No way.",
		    "Can't recommend it really.",
		"Don't think they were made for each other really."])
	end
	end


	return ary.join(' ')
end

def parse(phrase)
	p = phrase.match(/ship (.*) (and|\++|x+) (.*)/i)
	p_tree = {
		pair1: f(p[1]),
		pair2: f(p[3]),
	}
	return p_tree, p_tree.values.any?(&:empty?)
rescue StandardError
	return nil, nil
end

def deter(phrs)

	tree, err = parse(phrs)

	if tree.nil?
		return ra(["Didn't understand that, sorry",
		"Sorry mate, didn't quite get that"])
	end

	if err
		who = ""
		possible = tree.values.reject(&:empty?).first
		if possible
			who = who + possible.values.first[:name]
		end
		return who + " and who? could not figure that out"
	end
	a =  tree[:pair1].values.first[:name]
	b = tree[:pair2].values.first[:name]
	return calculate(tree[:pair1], tree[:pair2])

end

def fortune(phrs)
	p = phrs.match(/#fortune for (.+)/i)
	
	unless (p.nil? ? nil : p[1])
		"Your fortune: #{ra(FORTUNE)}"
	else
		"#{p[1]}'s fortune: #{ra(FORTUNE)}"
	end
end

def eightball
	system ("convert -alpha set -background none -rotate #{(rand(90)-45)} eightball/#{rand(20)+1}.png eightball/answer.png")
	"eightball/answer.png"
end

def episodes(query)
	p = (query || 'latest episodes from today').match(/latest episodes from (.*)/i)
	period = Chronic.parse(p[1])
	return "Couldn't understand that..." unless period
	rs = $db.execute("select name, aired from episodes where date(aired) <= date(?) order by aired desc limit 5", period.iso8601)
	return "No episodes before #{p[1]}!" if rs.length == 0
	report = rs.collect{|r| "#{r.first} (aired #{r.last})"}.join("\n")
	report
end

def generate_tier(tier, episodes)
	if episodes.empty?
		tiles = "tierlist/empty_tier.png"
	else
		tiles = "tierlist/#{tier}.png"
		eps = episodes.map { |e| "'cards/#{e}.png'" }.join(' ')
		system("montage #{eps} -geometry +2+2 -tile 6x -background \"#1a1a1a\" #{tiles}")
	end
	system("montage labels/#{tier}.png #{tiles} -geometry +4+4 -background black tierlist/#{tier}_tier_tiles.png")
end

def generate_tiers(eps)
	eps.each do |tier, episodes|
		generate_tier(tier, episodes)
	end
	system("montage #{['S', 'A', 'B', 'C', 'D', 'E', 'F'].map { |t| "tierlist/#{t}_tier_tiles.png" }.join(' ')} -geometry +0+0 -tile x8 -background black tierlist/tierlist.png")
end

def generate_tierlist
	h = {}
	['S', 'A', 'B', 'C', 'D', 'E', 'F'].each do |tier|
		rs = $db.execute("select * from (select episodes.name, scores.score, MAX(scores.created_at) from scores, episodes where scores.episode_id = episodes.id group by episode_id) where score = ?", [tier])
		h[tier] = rs.map { |row| row.first }
	end
	generate_tiers(h)
	"tierlist/tierlist.png"
end

def insert_score(score, episode)
	episode_id_row = $db.execute("select id from episodes where name = ? collate nocase limit 1", episode)
	return -1 if episode_id_row.length == 0
	episode_id = episode_id_row.first
	$db.execute("insert into scores(episode_id, score, created_at) values(?, ?, ?)", [episode_id, score, DateTime.now.to_s])
	return 0
end


def decouple(phrase)
	phrasing = phrase.match(/(.+) as (S|A|B|C|D|E|F|none)/)
	return nil unless phrasing
	phrase_episode = phrasing[1]
	phrased_rating = phrasing[2]
	{episode_name: phrasing[1], score: phrasing[2]}
end

def score(phrase)
	watched = []
	stuff = phrase.match(/score episodes? (.+)/)
	return [nil] unless stuff
	stuff[1].split(",").map(&:strip).each do |pair|
		watched << decouple(pair)
	end
	watched
end

def add_score(phrase)
	parsed = score(phrase)
	if parsed.include?(nil)
		return ["that."]
	end
	errors = []
	parsed.each do |score_hash|
		if insert_score(score_hash[:score], score_hash[:episode_name]) == -1
			errors << "'#{score_hash[:episode_name]}'"
		end
	end
	return errors
end

def help
	%Q(* Ship characters, ask "bilby, ship [character] and [character]
* Check your or someone's #fortune, ask "bilby, #fortune" or "bilby, fortune for @[person]"
* Check the latest episdoes, as, "bilby, list the latest episodes [from date]
* Shake the magic 8-ball, ask "bilby, ask 8-ball [question]")
end

begin
	$db = SQLite3::Database.open 'episodes.db'
rescue SQLite3::Exception => e
	puts e
	$db.close if $db
end

rs = $db.execute("select name from episodes")
rs.each do |ep|
	puts ep.first unless File.exist?("cards/#{ep.first}.png")
end

generate_tierlist

require 'discordrb'

begin
  bot = Discordrb::Bot.new token: File.read('token').strip
rescue
  exit
end

bot.message(content: /bilby, help/i) do |event|
	event.respond(help)
end

bot.message(content: /bilby,? ship.*/i, in: 'bob-bilby') do |event|
	event.respond(deter(event.content))
end

bot.message(content: /bilby,? #fortune( for)? .*/i, in: 'bob-bilby') do |event|
	event.respond(fortune(event.content))
end

bot.message(content: /bilby,? #fortune/i, in: 'bob-bilby') do |event|
	event.respond(fortune(event.content))
end

bot.message(content: /bilby,? ask 8-?ball.*/i, in: 'bob-bilby') do |event|
	event.send_file(File.open(eightball))
end

bot.message(content: /bilby,? list the latest episodes/i, in: 'bob-bilby') do |event|
	event.respond(episodes(nil))
end

bot.message(content: /bilby,? list the latest episodes from .*/i, in: 'bob-bilby') do |event|
	event.respond(episodes(event.content))
end

bot.message(content: /bilby,? score episode .*/i, in: 'bob-bilby') do |event|
	errors = add_score(event.content)
	if errors.empty?
		event.respond("Alright")
	else
		event.respond("Sorry didn't recognise #{errors.join(', ')}.")
	end
end

bot.message(content: /bilby,? show tier list/i, in: 'bob-bilby') do |event|
	event.send_file(File.open(generate_tierlist))
end

bot.run
$db.close if $db