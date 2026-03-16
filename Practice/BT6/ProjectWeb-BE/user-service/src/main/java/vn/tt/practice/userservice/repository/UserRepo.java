package vn.tt.practice.userservice.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import vn.tt.practice.userservice.model.User;

import java.util.Optional;

@Repository
public interface UserRepo extends MongoRepository<User, String> {
//    Optional<User> findById(String id);

    Optional<User> findByEmail(String email);

}
