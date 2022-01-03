require 'sqlite3'

begin
	db = SQLite3::Database.open 'episodes.db'
	s = db.prepare "select name from episodes order by aired desc limit 5"
	rs = s.execute
	rs.each { |r| puts r }
	s.close if s
rescue SQLite3::Exception => e
	puts e
ensure
	db.close if db
end
